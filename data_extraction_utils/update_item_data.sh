#!/bin/bash
set -ev

rm -f website/src/assets/fuser_params.json
rm -f website/src/assets/item_data.json
rm -rf website/public/icons/

mkdir -p website/src/assets/
mkdir -p website/public/icons/

cp extracted_fuser_params.json website/src/assets/fuser_params.json
cp extracted_item_data.json website/src/assets/item_data.json
cp extracted_icons/*.png website/public/icons/
