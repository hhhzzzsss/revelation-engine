#!/bin/bash
set -ev

rm -f data_extraction_utils/item-data-extractor.pck

godotpcktool data_extraction_utils/item-data-extractor.pck -a a --command-file data_extraction_utils/pck_commands.json
