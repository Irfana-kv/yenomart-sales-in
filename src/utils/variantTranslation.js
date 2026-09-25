/**
 * Utility for formatting and translating Chinese product variant/property names to English.
 */

const CHINESE_DICTIONARY = {
  // Attribute Keys
  "颜色分类": "Color",
  "颜色": "Color",
  "规格": "Specification",
  "尺寸": "Size",
  "尺码": "Size",
  "型号": "Model",
  "款式": "Style",
  "样式": "Style",
  "材质": "Material",
  "套餐": "Package",
  "包装": "Packaging",
  "类型": "Type",
  "版本": "Version",
  "适用机型": "Applicable Model",
  "净含量": "Net Content",
  "容量": "Capacity",
  "重量": "Weight",
  "数量": "Quantity",
  "属性": "Property",

  // Colors
  "黑色": "Black",
  "白色": "White",
  "灰色": "Gray",
  "红色": "Red",
  "蓝色": "Blue",
  "绿色": "Green",
  "黄色": "Yellow",
  "紫色": "Purple",
  "粉色": "Pink",
  "粉红": "Pink",
  "橙色": "Orange",
  "桔色": "Orange",
  "棕色": "Brown",
  "咖啡色": "Coffee Brown",
  "咖色": "Coffee",
  "金色": "Gold",
  "银色": "Silver",
  "米色": "Beige",
  "杏色": "Apricot",
  "驼色": "Camel",
  "卡其色": "Khaki",
  "卡其": "Khaki",
  "透明色": "Transparent",
  "透明": "Transparent",
  "藏青色": "Navy Blue",
  "藏青": "Navy Blue",
  "深蓝": "Dark Blue",
  "深蓝色": "Dark Blue",
  "天蓝": "Sky Blue",
  "天蓝色": "Sky Blue",
  "浅蓝": "Light Blue",
  "浅蓝色": "Light Blue",
  "浅绿": "Light Green",
  "浅绿色": "Light Green",
  "墨绿": "Dark Green",
  "墨绿色": "Dark Green",
  "军绿": "Army Green",
  "军绿色": "Army Green",
  "酒红": "Wine Red",
  "酒红色": "Wine Red",
  "玫红": "Rose Red",
  "玫红色": "Rose Red",
  "浅灰": "Light Gray",
  "浅灰色": "Light Gray",
  "深灰": "Dark Gray",
  "深灰色": "Dark Gray",
  "混色": "Mixed Colors",
  "多色": "Multicolor",
  "随机": "Random",
  "彩色": "Color",

  // Sizes & Dimensions
  "均码": "One Size (Free Size)",
  "通码": "Universal Size",
  "加大码": "Plus Size",
  "小号": "Small (S)",
  "中号": "Medium (M)",
  "大号": "Large (L)",
  "特大号": "Extra Large (XL)",
  "超大号": "XXL",
  "单人": "Single",
  "双人": "Double",
  "加厚": "Thickened",
  "加长": "Extended",
  "超薄": "Ultra Thin",
  "加绒": "Fleece Lined",

  // Package / Set / Modifiers
  "升级款": "Upgraded Edition",
  "升级版": "Upgraded Edition",
  "旗舰版": "Flagship Edition",
  "旗舰款": "Flagship Edition",
  "基础款": "Basic Edition",
  "标准款": "Standard Edition",
  "标准版": "Standard Edition",
  "豪华版": "Deluxe Edition",
  "套装": "Set",
  "礼盒装": "Gift Box",
  "彩盒": "Color Box",
  "裸装": "Bare Pack",
  "单只": "Single Piece",
  "单个": "Single Piece",
  "单件": "Single Piece",
  "一双": "1 Pair",
  "一套": "1 Set",
  "一袋": "1 Bag",
  "默认": "Default",
  "现货": "In Stock",
  "件套": " pcs set",
  "只装": " pcs pack",
  "个装": " pcs pack",
  "支装": " pcs pack",
  "件装": " pcs pack",
  "包装": " pack",
  "瓶装": " bottle pack",
  "盒装": " box pack",
  "袋装": " bag pack",
  "颗粒": " particles",
  "带武器": " with weapon",
  "站立": " standing",
  "战斗": " combat",
  "抱竹子": " holding bamboo",
  "爬竹梯": " climbing bamboo",
  "南瓜帽": " pumpkin hat",
  "越狱": " escape",
  "健身": " fitness",
  "喂雀": " feeding bird",
  "沙发猪": " sofa pig",
  "渴望猪": " desire pig",
  "摆烂猪": " swing pig",
  "爱心猪": " love pig",
  "调味碟": " sauce dish",
  "酱料碟": " seasoning dish",
  "粘尘纸": " dust removal paper",
  "全液": " full liquid",
  "表活凝珠": " laundry beads",
  "四腔": "4-chamber",
  "三腔": "3-chamber",
  "五腔": "5-chamber",
  "四叶草": "four-leaf clover",
  "爱心": "love heart",
  "四角": "square",
  "四方杯": "square cup",
  "矮款": "short model",
  "高款": "tall model",
  "直插": "direct plug",
  "小直插": "compact plug",
  "替换": "replacement",
  "原车": "original",
  "轿车警车": "police car",
  "系列": "series",
  "图案": "pattern",
  "只": " pcs",
  "个": " pcs",
  "件": " pcs",
  "支": " pcs",
  "双": " pairs",
  "套": " sets",
  "包": " packs",
  "盒": " boxes",
  "瓶": " bottles",
  "袋": " bags",
  "箱": " cartons",
  "米": " meters",
  "厘米": " cm",
  "毫米": " mm"
};

/**
 * Translates Chinese terms in a string using dictionary lookup and pattern replacement.
 */
export function translateChineseText(text) {
  if (!text || typeof text !== "string") return text || "";
  let result = text.trim();

  // If already pure ASCII (English/numbers/symbols), return as-is
  if (!/[\u4e00-\u9fa5]/.test(result)) {
    return result;
  }

  // Exact phrase match
  if (CHINESE_DICTIONARY[result]) {
    return CHINESE_DICTIONARY[result];
  }

  // Sort dictionary keys by descending length so multi-character phrases are replaced before single characters
  const sortedKeys = Object.keys(CHINESE_DICTIONARY).sort((a, b) => b.length - a.length);

  for (const key of sortedKeys) {
    if (result.includes(key)) {
      result = result.split(key).join(` ${CHINESE_DICTIONARY[key]} `);
    }
  }

  // Clean up excessive spaces, brackets and punctuation formatting
  return result
    .replace(/[【\[]/g, " [")
    .replace(/[】\]]/g, "] ")
    .replace(/[（(]/g, " (")
    .replace(/[）)]/g, ") ")
    .replace(/：/g, ": ")
    .replace(/[，、]/g, ", ")
    .replace(/。/g, ". ")
    .replace(/\s+/g, " ")
    .replace(/\[\s+/g, "[")
    .replace(/\s+\]/g, "]")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s*([,:;+/\-\[\]()])\s*/g, "$1 ")
    .replace(/([,:;+/\-\[\]()])([A-Za-z0-9])/g, "$1 $2")
    .replace(/([A-Za-z0-9])([(\[])/g, "$1 $2")
    .replace(/([)\]])([A-Za-z0-9])/g, "$1 $2")
    .trim();
}

/**
 * Strips raw Chinese characters and normalizes string for safe rendering in jsPDF / standard fonts.
 */
export function sanitizeForPdf(text) {
  if (!text || typeof text !== "string") return text || "";
  let clean = translateChineseText(text);

  clean = clean
    .replace(/[【\[]/g, "[")
    .replace(/[】\]]/g, "]")
    .replace(/[（(]/g, "(")
    .replace(/[）)]/g, ")")
    .replace(/：/g, ": ")
    .replace(/[，、]/g, ", ")
    .replace(/。/g, ". ")
    .replace(/—/g, "-")
    .replace(/–/g, "-")
    .replace(/“|”/g, '"')
    .replace(/‘|’/g, "'");

  // Remove any remaining raw Chinese characters so jsPDF never renders garbled characters
  clean = clean.replace(/[\u4e00-\u9fa5]/g, "").trim();

  // Clean up duplicate brackets like `]]` -> `]`
  clean = clean
    .replace(/\]+/g, "]")
    .replace(/\[+/g, "[")
    .replace(/\)+/g, ")")
    .replace(/\(+/g, "(")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.:;])/g, "$1")
    .trim();

  return clean;
}

/**
 * Formats any variant property value (array, object, or string) into a clean English string.
 *
 * @param {any} value - Raw variation data
 * @param {Array|Map} [englishProps] - Optional DB English multiLanguageInfos properties
 * @returns {string} English formatted variant string
 */
export function formatVariantEnglish(value, englishProps = null) {
  if (!value) return "";

  // 1. Build fast propMap lookup if englishProps provided
  let propMap = null;
  if (englishProps) {
    if (englishProps instanceof Map) {
      propMap = englishProps;
    } else if (Array.isArray(englishProps)) {
      propMap = new Map(
        englishProps.map((ep) => [`${ep.propId}_${ep.valueId}`, ep])
      );
    }
  }

  // 2. Handle Array of property objects (e.g. 1688 SKU properties)
  if (Array.isArray(value)) {
    const formattedList = value
      .map((item) => {
        if (!item) return null;
        if (typeof item === "string") {
          return sanitizeForPdf(item);
        }

        // Check if item has propId & valueId matching the English translation map
        if (propMap && item.propId !== undefined && item.valueId !== undefined) {
          const match = propMap.get(`${item.propId}_${item.valueId}`);
          if (match) {
            const prop = match.propName || item.attributeNameTrans || item.propName;
            const val = match.valueName || match.valueDesc || item.valueTrans || item.valueName;
            if (prop && val) return `${sanitizeForPdf(prop)}: ${sanitizeForPdf(val)}`;
            if (val) return sanitizeForPdf(val);
          }
        }

        // Direct English fields on the property object (priority order: valueTrans -> valueNameTrans -> valueNameEn)
        const valEn =
          item.valueTrans ||
          item.value_trans ||
          item.valueNameTrans ||
          item.valueDescTrans ||
          item.valTrans ||
          item.nameTrans ||
          item.valueNameEn ||
          item.valueName_en ||
          item.en_valueName ||
          item.value_en ||
          item.en_name ||
          item.name_en ||
          item.valueEn;

        const propEn =
          item.attributeNameTrans ||
          item.attributeName_trans ||
          item.propNameTrans ||
          item.attributeNameEn ||
          item.propNameEn ||
          item.propName_en ||
          item.en_propName ||
          item.prop_en ||
          item.propEn;

        const rawVal = valEn || item.valueName || item.value || item.name || item.val;
        const rawProp = propEn || item.attributeName || item.propName || item.prop || item.key;

        const cleanVal = sanitizeForPdf(rawVal);
        const cleanProp = sanitizeForPdf(rawProp);

        // Skip redundant "Specifications: Default" or "Default: Default" when other properties exist
        if ((cleanProp === "Specifications" || cleanProp === "Specification" || cleanProp === "Default") && (cleanVal === "Default" || !cleanVal)) {
          return null;
        }

        if (cleanProp && cleanVal && cleanProp !== cleanVal) {
          const propLabel = (cleanProp === "Color classification" || cleanProp === "Color") ? "Color" : cleanProp;
          return `${propLabel}: ${cleanVal}`;
        }
        return cleanVal || cleanProp || null;
      })
      .filter(Boolean);

    if (formattedList.length === 0) {
      // If only "Default" was present
      const first = value[0];
      if (first) {
        const val = first.valueTrans || first.valueName || first.value || "Default";
        return sanitizeForPdf(val);
      }
      return "";
    }

    return formattedList.join(", ");
  }

  // 3. Handle Object (e.g. { "颜色": "蓝色", "尺码": "XL" } or single item object)
  if (typeof value === "object") {
    // If it's a single property item object { propName, valueName, ... }
    if (value.valueTrans || value.valueName || value.propName || value.valueNameEn || value.value || value.name || value.attributeNameTrans) {
      const valEn =
        value.valueTrans ||
        value.value_trans ||
        value.valueNameTrans ||
        value.valueDescTrans ||
        value.valTrans ||
        value.nameTrans ||
        value.valueNameEn ||
        value.valueName_en ||
        value.en_valueName ||
        value.value_en ||
        value.en_name ||
        value.name_en;

      const propEn =
        value.attributeNameTrans ||
        value.attributeName_trans ||
        value.propNameTrans ||
        value.attributeNameEn ||
        value.propNameEn ||
        value.propName_en ||
        value.en_propName ||
        value.prop_en;

      const rawVal = valEn || value.valueName || value.value || value.name;
      const rawProp = propEn || value.attributeName || value.propName || value.prop || value.key;

      const cleanVal = sanitizeForPdf(rawVal);
      const cleanProp = sanitizeForPdf(rawProp);

      if (cleanProp && cleanVal && cleanProp !== cleanVal) {
        return `${cleanProp}: ${cleanVal}`;
      }
      return cleanVal || cleanProp || "";
    }

    // Key-value pairs dictionary
    const formattedEntries = Object.entries(value)
      .map(([key, val]) => {
        if (val === null || val === undefined || val === "") return null;
        const displayVal =
          typeof val === "object"
            ? val?.valueTrans || val?.valueNameEn || val?.valueName || val?.value || val?.name || JSON.stringify(val)
            : val;
        const cleanKey = sanitizeForPdf(key);
        const cleanVal = sanitizeForPdf(displayVal);
        if (cleanKey && cleanVal) {
          return `${cleanKey}: ${cleanVal}`;
        }
        return cleanVal || cleanKey || null;
      })
      .filter(Boolean);

    return formattedEntries.join(", ");
  }

  // 4. Handle String
  return sanitizeForPdf(String(value));
}
