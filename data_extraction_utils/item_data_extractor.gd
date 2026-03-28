extends Node

const ITEM_DATA_OUTPUT_PATH: String = "res://extracted_item_data.json"
const FUSER_PARAMS_OUTPUT_PATH = "res://extracted_fuser_params.json"
const IMAGES_OUTPUT_PATH: String = "res://extracted_icons"

func _ready() -> void:
    if not ItemMap.all_items_loaded:
        await ItemMap.items_done_loading
        
    print("[Item Data Extractor] Extracting item data...")
    
    # Serialize fuser params and save
    var serialized_fuser_params: Dictionary = fuser_params_to_dict(Ref.player_fuser)
    save_json(FUSER_PARAMS_OUTPUT_PATH, serialized_fuser_params)
    
    # Get valid items
    var all_items: Array = ItemMap.all_item_ids \
        .map(func(id: int): return ItemMap.id_to_resource[id]) \
        .filter(is_valid_item)
    
    # Serialize item data and save
    var serialized_item_data: Array = []
    for item: Item in all_items:
        serialized_item_data.append(item_to_dict(item))
    save_json(ITEM_DATA_OUTPUT_PATH, serialized_item_data)
    
    # Delete old extracted_icons directory
    clear_directory(IMAGES_OUTPUT_PATH)
    
    # Save all item icons
    var make_dir_err := DirAccess.make_dir_recursive_absolute(IMAGES_OUTPUT_PATH)
    assert(make_dir_err == OK or make_dir_err == ERR_ALREADY_EXISTS, "[Item Data Extractor] Failed to create icon directory: %s" % IMAGES_OUTPUT_PATH)
    for item: Item in all_items:
        var texture: Texture2D = item.icon
        if texture == null:
            print("[Item Data Extractor] Found image with null icon: %s" % item.display_name)
            continue
        var image: Image = texture.get_image()
        if image == null:
            print("[Item Data Extractor] Failed to decode icon image: %s" % item.display_name)
            continue
        var output_path := "%s/%d.png" % [IMAGES_OUTPUT_PATH, item.id]
        var save_err := image.save_png(output_path)
        assert(save_err == OK, "[Item Data Extractor] Failed to save icon: %s" % output_path)
    
    print("[Item Data Extractor] Finished extracting item data!")

func fuser_params_to_dict(fuser: Fuser) -> Dictionary:
    var fuser_dict: Dictionary = {}
    
    fuser_dict["used_properties"] = fuser.used_properties
    fuser_dict["used_properties_weights"] = fuser.used_properties_weights
    fuser_dict["tags"] = fuser.tags
    fuser_dict["tag_magnitude"] = fuser.tag_magnitude
    fuser_dict["color_weight"] = fuser.color_weight
    fuser_dict["samey_punishment"] = fuser.samey_punishment
    
    return fuser_dict

func item_to_dict(item: Item) -> Dictionary:
    var item_dict: Dictionary = {}
    
    item_dict["id"] = item.id
    item_dict["internal"] = item.internal
    item_dict["display_name"] = item.display_name
    item_dict["internal_name"] = item.internal_name
    item_dict["stack_size"] = item.stack_size
    item_dict["max_durability"] = item.max_durability
    item_dict["color"] = [item.color.r, item.color.g, item.color.b]
    
    assert(item.essence is VitalEssence)
    item_dict["essence"] = essence_to_dict(item.essence)
    
    if item is Block:
        var block: Block = item as Block
        item_dict["block_data"] = block_data_to_dict(block)
        item_dict["is_block"] = true
        
    return item_dict

func essence_to_dict(e: VitalEssence) -> Dictionary:
    var d: Dictionary = {}

    d["energy"] = e.energy
    d["fuseable"] = e.fuseable
    d["rank"] = e.rank
    d["bias"] = e.bias
    d["tags"] = e.tags
    d["output_tags"] = e.output_tags
    d["properties"] = {
        "clay": e.clay,
        "phlegm": e.phlegm,
        "sulfur": e.sulfur,
        "mercury": e.mercury,
        "aqua": e.aqua,
        "utility": e.utility,
        "edibility": e.edibility,
        "danger": e.danger,
        "wearability": e.wearability,
        "blockiness": e.blockiness,
        "hate": e.hate,
        "lust": e.lust,
        "faith": e.faith,
    }

    return d

func block_data_to_dict(b: Block) -> Dictionary:
    var d: Dictionary = {}
    
    d["unbreakable"] = b.unbreakable
    d["griefable"] = b.griefable
    d["flammability"] = b.flammability
    d["sustain_fire"] = b.sustain_fire
    if b.can_drop && b.drop_item == null && b.drop_loot == null:
        d["drop_item"] = b.id
    if b.drop_item != null:
        d["drop_item"] = b.drop_item.id
    if b.drop_loot != null:
        d["drop_loot"] = drop_loot_to_dict(b.drop_loot)
    d["pickaxe_affinity"] = b.pickaxe_affinity
    d["pickaxe_required"] = b.pickaxe_required
    d["meat_affinity"] = b.meat_affinity
    d["plant_affinity"] = b.plant_affinity
    d["shovel_affinity"] = b.shovel_affinity
    d["axe_affinity"] = b.axe_affinity
    d["axe_required"] = b.axe_required
    d["break_time"] = b.break_time
        
    return d

func drop_loot_to_dict(l: Loot) -> Dictionary:
    var d: Dictionary = {}
    
    d["items"] = l.items.map(func(item: Item): return item.id)
    d["chances"] = l.chances
    d["counts"] = l.counts
    d["drop_one_item_at_random"] = l.drop_one_item_at_random
    
    return d

func is_valid_item(i: Item) -> bool:
    if i.id == 0: return false # Exclude air
    if i.icon == null: return false
    if i is Block:
        if i.display_name.ends_with("+"): return false
        if i.display_name.ends_with("-"): return false
        if i.unbreakable and !i.essence.fuseable: return false
    return true

func clear_directory(path: String) -> void:
    if not DirAccess.dir_exists_absolute(path):
        return

    var dir := DirAccess.open(path)
    assert(dir != null, "[Item Data Extractor] Failed to open directory for cleanup: %s" % path)

    var list_err := dir.list_dir_begin()
    assert(list_err == OK, "[Item Data Extractor] Failed to list directory: %s" % path)

    var entry_name := dir.get_next()
    while entry_name != "":
        var entry_path := "%s/%s" % [path, entry_name]
        var remove_err := DirAccess.remove_absolute(entry_path)
        assert(remove_err == OK, "[Item Data Extractor] Failed to remove path during cleanup: %s" % entry_path)
        entry_name = dir.get_next()

    dir.list_dir_end()

func save_json(path: String, serialized: Variant):
    var json_text := JSON.stringify(serialized, "    ", true, true)
    var file := FileAccess.open(path, FileAccess.WRITE)
    assert(file != null, "[Item Data Extractor] Failed to open output file: %s" % path)
    file.store_string(json_text)
    file.close()
