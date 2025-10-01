#!/usr/bin/env node

// Collection画像の最適化スクリプト
// 残りの画像（5.JPG, 6.JPG, 7.JPG, 8.JPG, 9.JPG, 10.JPG, 2.JPG, 16.JPG）を最適化

const fs = require('fs');
const path = require('path');

const imageNumbers = ['5', '6', '7', '8', '9', '10', '2', '16'];

function createOptimizedPicture(imageNum, altText, url) {
  return `            <a href="${url}" target="_blank" rel="noopener">
              <picture>
                <source type="image/avif" srcset="
                  /.netlify/images?url=/image/${imageNum}.JPG&w=186&h=280&fit=cover&fm=avif&q=50 186w,
                  /.netlify/images?url=/image/${imageNum}.JPG&w=279&h=420&fit=cover&fm=avif&q=50 279w">
                <source type="image/webp" srcset="
                  /.netlify/images?url=/image/${imageNum}.JPG&w=186&h=280&fit=cover&fm=webp&q=65 186w,
                  /.netlify/images?url=/image/${imageNum}.JPG&w=279&h=420&fit=cover&fm=webp&q=65 279w">
                <img src="/.netlify/images?url=/image/${imageNum}.JPG&w=186&h=280&fit=cover&q=72"
                     srcset="
                       /.netlify/images?url=/image/${imageNum}.JPG&w=186&h=280&fit=cover&q=72 186w,
                       /.netlify/images?url=/image/${imageNum}.JPG&w=279&h=420&fit=cover&q=72 279w"
                     sizes="93px"
                     width="93" height="140"
                     loading="lazy" decoding="async" alt="${altText}">
              </picture>
            </a>`;
}

// URLマッピング（既存のURLを保持）
const urlMapping = {
  '5': 'https://restandard.stores.jp/items/68b089a53fed3c22dc1a6683',
  '6': 'https://restandard.stores.jp/items/68b10c2e3ffd8e02a5496586',
  '7': 'https://restandard.stores.jp/items/68b13955ff050400856e0b34',
  '8': 'https://restandard.stores.jp/items/68b145631c3f4f005e1e13f7',
  '9': 'https://restandard.stores.jp/items/68b15163c49f18004ad13ce2',
  '10': 'https://restandard.stores.jp/items/68b155e685f93411bc87861d',
  '2': 'https://restandard.stores.jp/items/68ac80478b0406e84acd6892',
  '16': 'https://restandard.stores.jp/items/68b16bf36c5f9e33ecab5706'
};

console.log('Collection画像の最適化パターンを生成しました:');
imageNumbers.forEach(num => {
  console.log(`\n${num}.JPG:`);
  console.log(createOptimizedPicture(num, `ReStandard コレクション 商品画像 ${num}`, urlMapping[num]));
});
