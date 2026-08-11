import type { Language } from "@/domain/types";

export type MessageKey =
  | "brand"
  | "loading"
  | "maps"
  | "nodeBrowser"
  | "nodeBrowserHeading"
  | "searchNodes"
  | "noMatchingNodes"
  | "mapCanvas"
  | "createRoot"
  | "createChild"
  | "createSibling"
  | "moveUp"
  | "moveDown"
  | "moveUnder"
  | "swapWithParent"
  | "detach"
  | "delete"
  | "cancel"
  | "apply"
  | "resize"
  | "resetWidth"
  | "palette"
  | "undo"
  | "redo"
  | "colorSlot"
  | "colorSlotN"
  | "colorSlotHex"
  | "nodeWidth"
  | "width"
  | "createMap"
  | "rename"
  | "switch"
  | "mapCatalog"
  | "mapManager"
  | "renameMap"
  | "finalMapCannotDelete"
  | "finalNodeCannotDelete"
  | "deleteConfirmTitle"
  | "deleteConfirmBody"
  | "moveUnderTitle"
  | "moveUnderTargets"
  | "editNodeMarkdown"
  | "nodeMarkdown"
  | "startTyping"
  | "resizeNode"
  | "language"
  | "languageEnglish"
  | "languagePersian"
  | "structureCommands"
  | "styleCommands"
  | "toolsSectionMap"
  | "toolsSectionStructure"
  | "toolsSectionStyle"
  | "toolsSectionApp"
  | "emptyNode"
  | "mapNowHasNodes"
  | "deletedMapNowHasNodes"
  | "editingNode"
  | "returnedToFocused"
  | "actionBar"
  | "openMap"
  | "mapNodes"
  | "paletteSlots"
  | "searchPlaceholder"
  | "exportMap"
  | "exportAllMaps"
  | "importMaps"
  | "importSelected"
  | "importInvalidMaps"
  | "selectImportMaps"
  | "importFailed"
  | "selectAtLeastOneMap"
  | "restorePalette"
  | "installMindi"
  | "notNow"
  | "offlineReady"
  | "updateReady"
  | "reloadUpdate"
  | "later"
  | "editingDraftUpdate"
  | "finishEditing"
  | "discardDraftReload"
  | "largeMapWarning"
  | "layingOut";

type Messages = Record<MessageKey, string>;

const en: Messages = {
  brand: "Mindi",
  loading: "Loading Mindi…",
  maps: "Maps",
  nodeBrowser: "Node browser",
  nodeBrowserHeading: "Node browser",
  searchNodes: "Search nodes",
  noMatchingNodes: "No matching nodes",
  mapCanvas: "Map canvas",
  createRoot: "Create Root",
  createChild: "Create child",
  createSibling: "Create sibling",
  moveUp: "Move up",
  moveDown: "Move down",
  moveUnder: "Move under",
  swapWithParent: "Swap with parent",
  detach: "Detach",
  delete: "Delete",
  cancel: "Cancel",
  apply: "Apply",
  resize: "Resize",
  resetWidth: "Reset width",
  palette: "Palette",
  undo: "Undo",
  redo: "Redo",
  colorSlot: "Color slot",
  colorSlotN: "Color slot {n}",
  colorSlotHex: "Color slot {n} hex",
  nodeWidth: "Node width",
  width: "Width",
  createMap: "Create Map",
  rename: "Rename",
  switch: "Switch",
  mapCatalog: "Map catalog",
  mapManager: "Map manager",
  renameMap: "Rename {name}",
  finalMapCannotDelete:
    "The final Map cannot be deleted. Create another Map first.",
  finalNodeCannotDelete:
    "The final Node cannot be deleted. Create another Node first.",
  deleteConfirmTitle: "Delete Node?",
  deleteConfirmBody:
    "This deletes the Node and {count} descendant Nodes. This cannot be undone.",
  moveUnderTitle: "Move under",
  moveUnderTargets: "Move under targets",
  editNodeMarkdown: "Edit node markdown",
  nodeMarkdown: "Node markdown",
  startTyping: "Start typing…",
  resizeNode: "Resize Node",
  language: "Language",
  languageEnglish: "English",
  languagePersian: "Persian",
  structureCommands: "Structure commands",
  styleCommands: "Style commands",
  toolsSectionMap: "Map",
  toolsSectionStructure: "Structure",
  toolsSectionStyle: "Style",
  toolsSectionApp: "App",
  emptyNode: "Empty Node",
  mapNowHasNodes: "Map now has {count} nodes.",
  deletedMapNowHasNodes: "Deleted. Map now has {count} nodes.",
  editingNode: "Editing Node.",
  returnedToFocused: "Returned to Focused.",
  actionBar: "Action bar",
  openMap: "Open",
  mapNodes: "Map nodes",
  paletteSlots: "Palette slots",
  searchPlaceholder: "Search…",
  exportMap: "Export Map",
  exportAllMaps: "Export all Maps",
  importMaps: "Import Maps",
  importSelected: "Import selected",
  importInvalidMaps: "Invalid Maps",
  selectImportMaps: "Select Maps to import",
  importFailed: "Import failed",
  selectAtLeastOneMap: "Select at least one valid Map to import.",
  restorePalette: "Replace the current Palette with the file snapshot",
  installMindi: "Install Mindi",
  notNow: "Not now",
  offlineReady: "Mindi is ready to work offline",
  updateReady: "Update ready",
  reloadUpdate: "Reload update",
  later: "Later",
  editingDraftUpdate: "Finish editing or discard the draft before reloading.",
  finishEditing: "Finish editing",
  discardDraftReload: "Discard draft and reload",
  largeMapWarning: "This Map has 512 or more Nodes. Performance may slow.",
  layingOut: "Laying out",
};

const fa: Messages = {
  brand: "میندی",
  loading: "در حال بارگذاری میندی…",
  maps: "نقشه‌ها",
  nodeBrowser: "مرورگر گره",
  nodeBrowserHeading: "مرورگر گره",
  searchNodes: "جستجوی گره‌ها",
  noMatchingNodes: "گره منطبقی نیست",
  mapCanvas: "بوم نقشه",
  createRoot: "ایجاد ریشه",
  createChild: "ایجاد فرزند",
  createSibling: "ایجاد هم‌سطح",
  moveUp: "جابه‌جایی به بالا",
  moveDown: "جابه‌جایی به پایین",
  moveUnder: "انتقال به زیر",
  swapWithParent: "جابه‌جایی با والد",
  detach: "جدا کردن",
  delete: "حذف",
  cancel: "انصراف",
  apply: "اعمال",
  resize: "تغییر عرض",
  resetWidth: "بازنشانی عرض",
  palette: "پالت",
  undo: "واگرد",
  redo: "بازانجام",
  colorSlot: "اسلات رنگ",
  colorSlotN: "اسلات رنگ {n}",
  colorSlotHex: "هگز اسلات رنگ {n}",
  nodeWidth: "عرض گره",
  width: "عرض",
  createMap: "ایجاد نقشه",
  rename: "تغییر نام",
  switch: "باز کردن",
  mapCatalog: "فهرست نقشه‌ها",
  mapManager: "مدیریت نقشه‌ها",
  renameMap: "تغییر نام {name}",
  finalMapCannotDelete:
    "نقشهٔ آخر را نمی‌توان حذف کرد. ابتدا نقشهٔ دیگری بسازید.",
  finalNodeCannotDelete:
    "گرهٔ آخر را نمی‌توان حذف کرد. ابتدا گرهٔ دیگری بسازید.",
  deleteConfirmTitle: "حذف گره؟",
  deleteConfirmBody:
    "این کار گره و {count} گرهٔ فرزند را حذف می‌کند. قابل بازگشت نیست.",
  moveUnderTitle: "انتقال به زیر",
  moveUnderTargets: "مقاصد انتقال به زیر",
  editNodeMarkdown: "ویرایش مارک‌داون گره",
  nodeMarkdown: "مارک‌داون گره",
  startTyping: "شروع به نوشتن…",
  resizeNode: "تغییر عرض گره",
  language: "زبان",
  languageEnglish: "انگلیسی",
  languagePersian: "فارسی",
  structureCommands: "فرمان‌های ساختار",
  styleCommands: "فرمان‌های ظاهر",
  toolsSectionMap: "نقشه",
  toolsSectionStructure: "ساختار",
  toolsSectionStyle: "ظاهر",
  toolsSectionApp: "برنامه",
  emptyNode: "گره خالی",
  mapNowHasNodes: "نقشه اکنون {count} گره دارد.",
  deletedMapNowHasNodes: "حذف شد. نقشه اکنون {count} گره دارد.",
  editingNode: "در حال ویرایش گره.",
  returnedToFocused: "بازگشت به حالت متمرکز.",
  actionBar: "نوار فرمان",
  openMap: "باز",
  mapNodes: "گره‌های نقشه",
  paletteSlots: "اسلات‌های پالت",
  searchPlaceholder: "جستجو…",
  exportMap: "برون‌بری نقشه",
  exportAllMaps: "برون‌بری همهٔ نقشه‌ها",
  importMaps: "درون‌ریزی نقشه‌ها",
  importSelected: "درون‌ریزی انتخاب‌شده‌ها",
  importInvalidMaps: "نقشه‌های نامعتبر",
  selectImportMaps: "نقشه‌های درون‌ریزی را انتخاب کنید",
  importFailed: "درون‌ریزی ناموفق بود",
  selectAtLeastOneMap: "دست‌کم یک نقشهٔ معتبر را برای درون‌ریزی انتخاب کنید.",
  restorePalette: "پالت کنونی را با تصویر پالتِ فایل جایگزین کن",
  installMindi: "نصب میندی",
  notNow: "فعلاً نه",
  offlineReady: "میندی برای کار آفلاین آماده است",
  updateReady: "به‌روزرسانی آماده است",
  reloadUpdate: "بارگذاری دوباره و به‌روزرسانی",
  later: "بعداً",
  editingDraftUpdate:
    "پیش از بارگذاری دوباره، ویرایش را تمام کنید یا پیش‌نویس را کنار بگذارید.",
  finishEditing: "پایان ویرایش",
  discardDraftReload: "کنار گذاشتن پیش‌نویس و بارگذاری دوباره",
  largeMapWarning: "این نقشه ۵۱۲ گره یا بیشتر دارد. ممکن است عملکرد کند شود.",
  layingOut: "در حال چیدمان",
};

const tables: Record<Language, Messages> = { en, fa };

export function messageTable(language: Language): Messages {
  return tables[language] ?? tables.en;
}
