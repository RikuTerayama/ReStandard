"""Read-only BASE public-store snapshot. No authentication or private endpoints.

The public listing is the scope, not administrative inventory. Stock quantities,
hidden items and private variant IDs remain unknown. Failed/partial reads never
replace the previous successful snapshot.
"""
import concurrent.futures
import datetime
import hashlib
import json
import re
import sys
import time
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SHOP = "https://restandard.base.ec"
PRIVATE = ROOT / ".catalog-private" / "public-source"


def get(url):
    request = urllib.request.Request(url, headers={"User-Agent": "ReStandard catalog verification", "Accept": "text/html"})
    with urllib.request.urlopen(request, timeout=25) as response:
        if response.status != 200 or not response.url.startswith(SHOP + "/"):
            raise ValueError("Unexpected public response")
        return response.read().decode("utf-8-sig")


class ProductParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.meta, self.images, self.description, self.options = {}, [], [], []
        self.description_depth = 0
        self.option = None
        self.select = None
        self.purchase_text = []
        self.purchase_depth = 0
        self.sold_out = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "purchaseButton__btn--soldOut" in a.get("class", "").split() and not re.search(r"display\s*:\s*none", a.get("style", "")):
            self.sold_out = True
        if tag == "meta":
            self.meta[a.get("property", a.get("name", ""))] = a.get("content", "")
        if tag == "div":
            if "itemDescription" in a.get("class", "").split():
                self.description_depth = 1
            elif self.description_depth:
                self.description_depth += 1
            if "purchase" in a.get("class", "").split():
                self.purchase_depth = 1
            elif self.purchase_depth:
                self.purchase_depth += 1
        if tag == "br" and self.description_depth:
            self.description.append("\n")
        if tag == "a" and a.get("data-fancybox") == "group":
            self.images.append({"url": a["href"]})
        if tag == "select":
            self.select = a
        if tag == "option" and self.select and self.select.get("name") == "select":
            self.option = {"value": a.get("value"), "text": "", "disabled": "disabled" in a}

    def handle_endtag(self, tag):
        if tag == "div":
            self.description_depth = max(0, self.description_depth - 1)
            self.purchase_depth = max(0, self.purchase_depth - 1)
        if tag == "option" and self.option is not None:
            if self.option["value"] and self.option["value"] != "0":
                self.options.append(self.option)
            self.option = None
        if tag == "select":
            self.select = None

    def handle_data(self, text):
        if self.description_depth:
            self.description.append(text)
        if self.option is not None:
            self.option["text"] += text
        if self.purchase_depth:
            self.purchase_text.append(text)


def listing():
    first = get(SHOP + "/")
    found = re.search(r'id="max_page"[^>]*>\s*(\d+)', first)
    if not found:
        raise ValueError("Public listing pagination markup changed")
    count = int(found[1])
    if not 1 <= count <= 100:
        raise ValueError("Unexpected public pagination count")
    # BASE renders cumulative pages on the /N URLs used by its own VIEW MORE UI.
    last = first if count == 1 else get(SHOP + f"/{count}")
    ids = list(dict.fromkeys(re.findall(r'https://restandard\.base\.ec/items/(\d+)', last)))
    if not ids:
        raise ValueError("No public product links")
    PRIVATE.mkdir(parents=True, exist_ok=True)
    (PRIVATE / "listing.html").write_text(last, encoding="utf-8")
    return ids


def product(id):
    html = get(SHOP + "/items/" + id)
    p = ProductParser()
    p.feed(html)
    name = re.sub(r" \| ReStandard.*$", "", p.meta.get("og:title", ""))
    description = "".join(p.description).strip()
    if not name or not description or not p.images:
        raise ValueError(f"Product {id}: expected public markup missing")
    price = p.meta.get("product:price:amount", "")
    if not re.fullmatch(r"\d+", price):
        raise ValueError(f"Product {id}: price unavailable")
    sold_out = p.sold_out
    # Availability is an observed label, never an invented numerical stock count.
    variant_options = list({o["value"]: o for o in p.options}.values())
    (PRIVATE / f"{id}.html").write_text(html, encoding="utf-8")
    return {"id": int(id), "type": "normal", "name": name, "detail": description,
            "images": p.images, "price": int(price), "stock": None, "visible": True,
            "sales_status": None, "identifier": None,
            "variations": [{"id": int(o["value"]), "name": o["text"].strip(), "stock": None, "identifier": None, "barcode": None} for o in variant_options],
            "categories": [], "options": [],
            "publicAvailability": "sold-out" if sold_out else "unknown",
            "publicOptions": variant_options,
            "observedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "sourceHtmlSha256": hashlib.sha256(html.encode()).hexdigest()}


def main():
    ids = listing()
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        items = list(pool.map(product, ids))
    if listing() != ids:
        raise ValueError("Public listing changed during import; retry without publishing partial data")
    result = {"schemaVersion": 1, "source": "base-public-store", "complete": False,
              "publicListingComplete": True, "publicListingIds": ids,
              "fetchedAt": min(p["observedAt"] for p in items), "shopUrl": SHOP,
              "shopVisible": True, "items": items,
              "limitations": ["Administrative hidden/deleted distinction unavailable", "Exact stock unavailable", "Private variant identifiers unavailable"]}
    output = ROOT / "catalog" / "public-snapshot.json"
    temp = output.with_suffix(".json.tmp")
    temp.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    temp.replace(output)
    (ROOT / "catalog" / "public-sync-status.json").write_text(json.dumps({"ok": True, "lastSuccessAt": result["fetchedAt"], "publicProducts": len(items)}, indent=2), encoding="utf-8")
    print(json.dumps({"publicProducts": len(items), "images": sum(len(p["images"]) for p in items),
                      "soldOutIds": [p["id"] for p in items if p["publicAvailability"] == "sold-out"],
                      "withOptions": [{"id": p["id"], "options": p["publicOptions"]} for p in items if p["publicOptions"]]}, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        (ROOT / "catalog" / "public-sync-status.json").write_text(json.dumps({"ok": False, "attemptedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(), "code": "PUBLIC_SYNC_FAILED"}, indent=2), encoding="utf-8")
        print(f"Public sync failed: {type(error).__name__}: {error}", file=sys.stderr)
        sys.exit(1)
