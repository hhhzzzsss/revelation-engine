import type { Color, FuserParameters, Item, QuantifiedItem } from '../item/types';

interface PreprocessedItem {
  item: Item;
  moodVector: number[];
  weightedMoodVector: number[];
  tagIds: number[];
  outputTagIds: number[];
}

class ApotheosisSolver {
  private usedProperties: string[];
  private usedPropertiesWeights: Record<string, number>;
  private tags: string[];
  private tagMagnitude: number;
  private colorWeight: number;
  private sameyPunishment: number;
  private pItemData: PreprocessedItem[];
  private pItemMap: Record<number, PreprocessedItem>;
  public instabilityDetected = false;

  constructor(fuserParams: FuserParameters, itemData: Item[]) {
    this.usedProperties = fuserParams.used_properties;
    this.usedPropertiesWeights = fuserParams.used_properties_weights;
    this.tags = fuserParams.tags.toSorted();
    this.tagMagnitude = fuserParams.tag_magnitude;
    this.colorWeight = fuserParams.color_weight;
    this.sameyPunishment = fuserParams.samey_punishment;

    this.pItemData = itemData.map(this.preprocessItem);
    this.pItemMap = {};
    this.pItemData.forEach((pItem) => {
      this.pItemMap[pItem.item.id] = pItem;
    });
  }

  private preprocessItem = (item: Item): PreprocessedItem => {
    const moodVector = this.usedProperties.map((prop) => item.essence.properties[prop]);
    const weightedMoodVector = this.usedProperties.map((prop) => item.essence.properties[prop] * this.usedPropertiesWeights[prop]);
    const tagIds = item.essence.tags.map((tag) => this.tags.indexOf(tag)).filter((id) => id !== -1).sort();
    const outputTagIds = item.essence.output_tags.map((tag) => this.tags.indexOf(tag)).filter((id) => id !== -1).sort();
    return { item, moodVector, weightedMoodVector, tagIds, outputTagIds };
  };

  public fuse(qItems: QuantifiedItem[]): QuantifiedItem | null {    
    const usedIds = new Set<number>(qItems.map((qItem) => qItem.item.id));
    if (usedIds.size < 2) {
      return null;
    }

    let totalEnergy = 0;
    for (const { item, count } of qItems) {
      totalEnergy += item.essence.energy * count;
    }
    if (totalEnergy <= 0) {
      totalEnergy = 0.01;
    }

    const moodVector = new Array<number>(this.usedProperties.length).fill(0);
    const averageColor = new Array<number>(3).fill(0) as Color;
    const tagVector = new Array<boolean>(this.tags.length).fill(false);
    const outputTagVector = new Array<boolean>(this.tags.length).fill(false);

    // Sum up mood vectors and colors, and combine tags with OR
    for (const { item, count } of qItems) {
      const pItem = this.pItemMap[item.id];

      const energyProportion = (item.essence.energy * count) / totalEnergy;

      pItem.weightedMoodVector.forEach((value, index) => {
        moodVector[index] += value * energyProportion;
      });
      pItem.item.color.forEach((value, index) => {
        averageColor[index] += value * energyProportion;
      });
      pItem.tagIds.forEach((tagId) => {
        tagVector[tagId] = true;
      });
      pItem.outputTagIds.forEach((tagId) => {
        outputTagVector[tagId] = true;
      });
    }

    // Find the closest item in the preprocessed data
    let closestItem = null as PreprocessedItem | null;
    let secondClosestItem = null as PreprocessedItem | null;
    let closestDistance = Infinity;
    let secondClosestDistance = Infinity;
    this.pItemData.forEach((pItem) => {
      if (!pItem.item.essence.fuseable) return;

      const distance = this.itemDistance(pItem, moodVector, averageColor, tagVector, outputTagVector, usedIds);
      if (distance < closestDistance) {
        secondClosestDistance = closestDistance;
        closestDistance = distance;
        secondClosestItem = closestItem;
        closestItem = pItem;
      }
    });

    if (Math.abs(closestDistance - secondClosestDistance) < 0.0001) {
      console.warn(`The two closest items, "${closestItem?.item.display_name}" and "${secondClosestItem?.item.display_name}", are very close in distance. This may lead to unpredictable results.`);
    }
    
    if (!closestItem) {
      return null;
    }

    const itemCount = Math.max(Math.round(
      totalEnergy / closestItem.item.essence.energy
    ), 1);

    return {
      item: closestItem.item,
      count: itemCount,
    };
  }
  itemDistance = (
    pItem: PreprocessedItem,
    moodVector: number[],
    averageColor: Color,
    tagVector: boolean[],
    outputTagVector: boolean[],
    usedIds: Set<number>,
  ): number => {
    const essenceDistance = this.vectorDistance(pItem.moodVector, moodVector);
    const colorDistance = this.vectorDistance(pItem.item.color, averageColor);
    const tagSimilarity = this.tagSimilarity(pItem.tagIds, tagVector);
    const outputTagSimilarity = this.tagSimilarity(pItem.tagIds, outputTagVector);

    const distance = (
      essenceDistance
      + colorDistance * this.colorWeight
      - tagSimilarity * this.tagMagnitude
      - outputTagSimilarity * 1000
      - 2.5 * pItem.item.essence.bias
      + (usedIds.has(pItem.item.id) ? this.sameyPunishment : 0)
    );

    return distance;
  };
  vectorDistance = (candidateVector: number[], vector: number[]): number => {
    let distSquared = 0;
    candidateVector.forEach((value, i) => {
      const diff = value - vector[i];
      distSquared += diff * diff;
    });
    return Math.sqrt(distSquared);
  };
  tagSimilarity = (candidateTagIds: number[], tagVector: boolean[]): number => {
    let similarity = 0;
    candidateTagIds.forEach((id) => {
      if (tagVector[id]) {
        similarity += 1;
      }
    });
    return similarity;
  };
}

export default ApotheosisSolver;
