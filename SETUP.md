# Setup

This will be a short guide on how to set up and run a local instance of Revelation Engine as well as import new item data from the game.

## Step 1 - Clone or Download Revelation Engine from Github

Either clone or download the `revelation-engine` repository from [https://github.com/hhhzzzsss/revelation-engine](https://github.com/hhhzzzsss/revelation-engine). If you choose to download the repo as a zip, you will need to extract it somewhere.

After this, you should have a folder called `revelation-engine`.

## Step 2 - Extract New Item Data (Optional)

Find the item-data-extractor utility mod in side the `revelation-engine` folder at `data_extraction_utils/item-data-extractor.pck`.
Then, place this in your game's `mods` folder. This is usually at `C:\Program Files (x86)\Steam\steamapps\common\lucid-blocks\mods`.

Launch lucid blocks and wait until you see the title screen. Now, inside your game's save folder, which is normally located at `%APPDATA%/lucid blocks/`, there should be a folder called `item_data_extractor`. That folder should contain `extracted_icons`, `extracted_fuser_params.json`, and `extracted_item_data.json`

Use these files/directories to replace the corresonding files/directories in the `revelation-engine` folder as follows:
- `extracted_icons` -> `website/public/icons`
- `extracted_fuser_params.json` -> `website/src/assets/fuser_params.json`
- `extracted_item_data.json` -> `website/src/assets/item_data.json`

## Step 3 - Run

Revelation Engine is developed using Bun as the package manager, though npm should also work if preferred.

Follow the instructions here to install bun: [https://bun.com/docs/installation](https://bun.com/docs/installation).

Then, open a terminal and navigate to the `website` folder (i.e. run `cd website`). If this is an existing terminal and you have just installed bun, you may have to restart your terminal first.

From that folder, run the following commands:
1. `bun install`
2. `bun run dev`

Assuming you properly installed bun, that should spin up a local instance of revelation engine at `http://localhost:5173`, which you can open in your browser.
