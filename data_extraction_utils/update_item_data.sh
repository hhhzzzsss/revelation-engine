#!/bin/bash
set -ev

rm -f website/public/fuser_params.json
rm -f website/public/item_data.json
rm -rf website/public/icons/
mkdir -p website/public/icons/
cp extracted_fuser_params.json website/public/fuser_params.json
cp extracted_item_data.json website/public/item_data.json
cp extracted_icons/*.png website/public/icons/
