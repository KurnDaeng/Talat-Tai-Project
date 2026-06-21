const PRODUCTS_STORAGE_KEY = "talat-tai-products";
const ORDERS_STORAGE_KEY = "talat-tai-orders";
const SETTINGS_STORAGE_KEY = "talat-tai-settings";
const CUSTOMER_STORAGE_KEY = "talat-tai-customer";
const BRAND_STORAGE_KEY = "talat-tai-brand";
const CLOUD = window.TALAT_TAI_CLOUD || { enabled: false };

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

const defaultSettings = window.TALAT_TAI_DEFAULT_SETTINGS || {
  currency: "THB",
  freeShippingAt: 1500,
  shippingFee: 60,
  paymentMode: "demo",
  createChargeEndpoint: "/api/payments/thai-qr",
};
const savedSettings = readJson(SETTINGS_STORAGE_KEY, {});
const STORE_CONFIG = {
  ...defaultSettings,
  ...savedSettings,
  paymentQr: {
    ...(defaultSettings.paymentQr || {}),
    ...(savedSettings.paymentQr || {}),
  },
};
let products = readJson(
  PRODUCTS_STORAGE_KEY,
  cloneData(window.TALAT_TAI_DEFAULT_PRODUCTS || []),
);
let currentCustomer = readJson(CUSTOMER_STORAGE_KEY, null);
let lastCustomerDetails = {};

const translations = {
  en: {
    customerLoginEyebrow: "Welcome to TALAT TAI",
    customerLoginTitle: "Sign in before shopping",
    customerLoginBody:
      "Enter your name and email so your orders and payment receipts stay connected to you.",
    customerLoginButton: "Send secure login link",
    customerLoginNote: "We will email you a secure link to enter the store.",
    customerLoginSending: "Sending your secure login link...",
    customerLoginSent: "Check your email and tap the TALAT TAI login link.",
    customerLogout: "Log out",
    announcement: "Free delivery in Thailand for orders over ฿1,500",
    navShop: "Shop",
    navStory: "Our story",
    navValues: "Why us",
    cart: "Cart",
    heroEyebrow: "Small batch. Made with care.",
    heroTitle: "Beautiful things,<br />made close to home.",
    heroDescription:
      "Thoughtful everyday goods from independent Thai makers, selected for their craft, story, and lasting quality.",
    shopCollection: "Shop the collection",
    thaiMade: "Thai made",
    deliveryDays: "day delivery",
    securePayment: "secure payment",
    heroNote: "Crafted by a family studio in Chiang Mai",
    marqueeOne: "Independent makers",
    marqueeTwo: "Natural materials",
    marqueeThree: "Made in Thailand",
    marqueeFour: "Mindful packaging",
    collectionEyebrow: "The first collection",
    collectionTitle: "Objects worth keeping",
    filterAll: "All",
    filterHome: "Home",
    filterWear: "Wear",
    filterGifts: "Gifts",
    filterFood: "Food",
    storyEyebrow: "A more personal way to shop",
    storyTitle: "Every purchase keeps a craft alive.",
    storyBody:
      "We work directly with small studios and family businesses. That means fair prices for makers, honest materials, and objects with a real human story behind them.",
    meetMakers: "Meet our makers",
    valueOneTitle: "Made in small batches",
    valueOneBody: "Less waste, more attention, and no anonymous factory lines.",
    valueTwoTitle: "Flexible bank transfer checkout",
    valueTwoBody: "Choose Thai QR, Myanmar QR, or crypto payment.",
    valueThreeTitle: "Packed with intention",
    valueThreeBody: "Plastic-light packaging that is ready to give or keep.",
    footerLine: "Good objects. Good stories. Made here.",
    footerShop: "Shop",
    footerHelp: "Help",
    contact: "Contact",
    shipping: "Shipping & returns",
    yourOrder: "Your order",
    emptyTitle: "Your cart is waiting",
    emptyBody: "Add something made with care.",
    continueShopping: "Continue shopping",
    subtotal: "Subtotal",
    shippingAtCheckout: "Shipping calculated at checkout",
    checkout: "Checkout",
    stepOne: "Step 1 of 3",
    stepTwo: "Step 2 of 3",
    deliveryDetails: "Delivery details",
    fullName: "Full name",
    phone: "Phone number",
    email: "Email",
    address: "Address",
    district: "District",
    province: "Province",
    postcode: "Postcode",
    continuePayment: "Continue to payment",
    scanPay: "Bank transfer",
    scanInstructions: "Choose a payment method, scan its QR, then upload your receipt.",
    demoTitle: "Manual payment review",
    demoBody: "Confirm the QR details before paying. The seller will review your receipt.",
    receiptTitle: "Upload receipt photo",
    receiptBrowse: "Choose image",
    receiptHint: "Upload your bank slip so the seller can check payment.",
    receiptEmpty: "No receipt uploaded yet.",
    receiptPreparing: "Preparing receipt...",
    receiptReady: "Receipt ready for seller review.",
    receiptRequired: "Please upload your receipt photo first.",
    receiptTooLarge: "Receipt image is too large. Please use a smaller image.",
    receiptInvalid: "Please upload an image file.",
    receiptStorageError: "Could not save this receipt locally. Please use a smaller image.",
    submitReceipt: "Submit receipt for review",
    backDetails: "← Back to delivery details",
    paymentConfirmed: "Receipt submitted",
    thankYou: "Thank you for your order.",
    confirmationBody: "We received your receipt. The seller will approve or reject it from the admin dashboard.",
    orderNumber: "Order number",
    orderSummary: "Order summary",
    delivery: "Delivery",
    total: "Total",
    paymentTrust: "Payment status should be verified securely by your payment server.",
    addedToCart: "added to your cart",
    soldOut: "is sold out",
  },
  th: {
    customerLoginEyebrow: "ยินดีต้อนรับสู่ TALAT TAI",
    customerLoginTitle: "เข้าสู่ระบบก่อนเลือกซื้อสินค้า",
    customerLoginBody: "กรอกชื่อและอีเมลเพื่อเชื่อมคำสั่งซื้อและสลิปการชำระเงินกับคุณ",
    customerLoginButton: "ส่งลิงก์เข้าสู่ระบบ",
    customerLoginNote: "เราจะส่งลิงก์เข้าสู่ระบบที่ปลอดภัยไปทางอีเมล",
    customerLoginSending: "กำลังส่งลิงก์เข้าสู่ระบบ...",
    customerLoginSent: "ตรวจสอบอีเมลและแตะลิงก์เข้าสู่ระบบ TALAT TAI",
    customerLogout: "ออกจากระบบ",
    announcement: "จัดส่งฟรีทั่วไทย เมื่อสั่งซื้อครบ ฿1,500",
    navShop: "สินค้า",
    navStory: "เรื่องของเรา",
    navValues: "ทำไมต้องเรา",
    cart: "ตะกร้า",
    heroEyebrow: "ผลิตจำนวนน้อย ใส่ใจทุกชิ้น",
    heroTitle: "ของสวยงาม<br />ที่สร้างขึ้นใกล้บ้าน",
    heroDescription:
      "ของใช้ที่คัดสรรจากผู้ผลิตอิสระชาวไทย เลือกจากฝีมือ เรื่องราว และคุณภาพที่อยู่กับคุณได้นาน",
    shopCollection: "เลือกชมสินค้า",
    thaiMade: "ผลิตในไทย",
    deliveryDays: "วันถึงบ้าน",
    securePayment: "จ่ายปลอดภัย",
    heroNote: "สร้างสรรค์โดยสตูดิโอครอบครัวในเชียงใหม่",
    marqueeOne: "ผู้ผลิตอิสระ",
    marqueeTwo: "วัสดุธรรมชาติ",
    marqueeThree: "ผลิตในประเทศไทย",
    marqueeFour: "บรรจุอย่างใส่ใจ",
    collectionEyebrow: "คอลเลกชันแรก",
    collectionTitle: "ของที่ควรค่าแก่การเก็บรักษา",
    filterAll: "ทั้งหมด",
    filterHome: "ของแต่งบ้าน",
    filterWear: "เครื่องแต่งกาย",
    filterGifts: "ของขวัญ",
    filterFood: "อาหาร",
    storyEyebrow: "วิธีช้อปที่เป็นกันเองมากขึ้น",
    storyTitle: "ทุกการซื้อช่วยให้งานคราฟต์อยู่ต่อไป",
    storyBody:
      "เราทำงานโดยตรงกับสตูดิโอขนาดเล็กและธุรกิจครอบครัว ผู้ผลิตจึงได้รับราคาที่เป็นธรรม คุณได้วัสดุที่จริงใจ และของทุกชิ้นมีเรื่องราวของคนอยู่เบื้องหลัง",
    meetMakers: "รู้จักผู้ผลิตของเรา",
    valueOneTitle: "ผลิตทีละน้อย",
    valueOneBody: "ลดของเสีย เพิ่มความใส่ใจ และไม่มีสายพานโรงงานไร้ตัวตน",
    valueTwoTitle: "โอนเงินได้หลายช่องทาง",
    valueTwoBody: "เลือก Thai QR, Myanmar QR หรือชำระด้วยคริปโต",
    valueThreeTitle: "แพ็กอย่างตั้งใจ",
    valueThreeBody: "ลดการใช้พลาสติก พร้อมส่งเป็นของขวัญหรือเก็บไว้เอง",
    footerLine: "ของดี เรื่องราวดี สร้างขึ้นที่นี่",
    footerShop: "ร้านค้า",
    footerHelp: "ช่วยเหลือ",
    contact: "ติดต่อเรา",
    shipping: "การจัดส่งและคืนสินค้า",
    yourOrder: "คำสั่งซื้อของคุณ",
    emptyTitle: "ตะกร้ายังว่างอยู่",
    emptyBody: "เลือกของที่สร้างขึ้นอย่างใส่ใจสักชิ้น",
    continueShopping: "เลือกสินค้าต่อ",
    subtotal: "ยอดสินค้า",
    shippingAtCheckout: "คำนวณค่าจัดส่งในขั้นตอนชำระเงิน",
    checkout: "ชำระเงิน",
    stepOne: "ขั้นตอน 1 จาก 3",
    stepTwo: "ขั้นตอน 2 จาก 3",
    deliveryDetails: "ข้อมูลการจัดส่ง",
    fullName: "ชื่อและนามสกุล",
    phone: "เบอร์โทรศัพท์",
    email: "อีเมล",
    address: "ที่อยู่",
    district: "เขต / อำเภอ",
    province: "จังหวัด",
    postcode: "รหัสไปรษณีย์",
    continuePayment: "ไปที่การชำระเงิน",
    scanPay: "โอนเงินผ่านธนาคาร",
    scanInstructions: "เลือกช่องทางการชำระเงิน สแกน QR แล้วอัปโหลดสลิป",
    demoTitle: "ตรวจสอบการชำระเงินโดยผู้ขาย",
    demoBody: "ตรวจสอบข้อมูล QR ก่อนชำระเงิน ผู้ขายจะตรวจสอบสลิปของคุณ",
    receiptTitle: "อัปโหลดรูปสลิป",
    receiptBrowse: "เลือกรูปภาพ",
    receiptHint: "อัปโหลดสลิปธนาคารเพื่อให้ผู้ขายตรวจสอบการชำระเงิน",
    receiptEmpty: "ยังไม่ได้อัปโหลดสลิป",
    receiptPreparing: "กำลังเตรียมสลิป...",
    receiptReady: "สลิปพร้อมให้ผู้ขายตรวจสอบแล้ว",
    receiptRequired: "กรุณาอัปโหลดรูปสลิปก่อน",
    receiptTooLarge: "รูปสลิปมีขนาดใหญ่เกินไป กรุณาใช้รูปที่เล็กลง",
    receiptInvalid: "กรุณาอัปโหลดไฟล์รูปภาพ",
    receiptStorageError: "ไม่สามารถบันทึกสลิปนี้ในเครื่องได้ กรุณาใช้รูปที่เล็กลง",
    submitReceipt: "ส่งสลิปให้ผู้ขายตรวจสอบ",
    backDetails: "← กลับไปแก้ข้อมูลจัดส่ง",
    paymentConfirmed: "ส่งสลิปแล้ว",
    thankYou: "ขอบคุณสำหรับคำสั่งซื้อ",
    confirmationBody: "เราได้รับสลิปแล้ว ผู้ขายจะตรวจสอบและอนุมัติหรือปฏิเสธในหน้าผู้ดูแล",
    orderNumber: "เลขที่คำสั่งซื้อ",
    orderSummary: "สรุปคำสั่งซื้อ",
    delivery: "ค่าจัดส่ง",
    total: "ยอดรวม",
    paymentTrust: "สถานะการชำระเงินควรได้รับการตรวจสอบอย่างปลอดภัยโดยเซิร์ฟเวอร์",
    addedToCart: "เพิ่มลงตะกร้าแล้ว",
    soldOut: "สินค้าหมดแล้ว",
  },
  mm: {
    customerLoginEyebrow: "TALAT TAI မှ ကြိုဆိုပါသည်",
    customerLoginTitle: "ဈေးမဝယ်မီ အကောင့်ဝင်ပါ",
    customerLoginBody: "မှာယူမှုနှင့် ငွေလွှဲပြေစာများကို ချိတ်ဆက်ရန် အမည်နှင့် အီးမေးလ် ထည့်ပါ။",
    customerLoginButton: "လုံခြုံသော အကောင့်ဝင်လင့်ခ် ပို့ရန်",
    customerLoginNote: "ဆိုင်သို့ဝင်ရန် လုံခြုံသောလင့်ခ်ကို အီးမေးလ်ဖြင့် ပို့ပါမည်။",
    customerLoginSending: "အကောင့်ဝင်လင့်ခ် ပို့နေပါသည်...",
    customerLoginSent: "အီးမေးလ်ကို စစ်ပြီး TALAT TAI အကောင့်ဝင်လင့်ခ်ကို နှိပ်ပါ။",
    customerLogout: "အကောင့်ထွက်ရန်",
    announcement: "ထိုင်းနိုင်ငံအတွင်း ฿1,500 နှင့်အထက် မှာယူပါက ပို့ဆောင်ခအခမဲ့",
    navShop: "ထုတ်ကုန်များ",
    navStory: "ကျွန်ုပ်တို့အကြောင်း",
    navValues: "အဘယ်ကြောင့် ကျွန်ုပ်တို့",
    cart: "ဈေးခြင်း",
    heroEyebrow: "အရေအတွက်နည်းနည်း၊ ဂရုတစိုက် ပြုလုပ်ထားသည်",
    heroTitle: "လှပသောပစ္စည်းများ<br />အိမ်နှင့်နီးရာတွင် ဖန်တီးထားသည်",
    heroDescription:
      "ထိုင်းနိုင်ငံရှိ လွတ်လပ်သော လက်မှုပညာရှင်များထံမှ လက်ရာ၊ ဇာတ်လမ်းနှင့် ကြာရှည်ခံအရည်အသွေးအတွက် ရွေးချယ်ထားသော နေ့စဉ်သုံးပစ္စည်းများ။",
    shopCollection: "ထုတ်ကုန်များ ကြည့်ရန်",
    thaiMade: "ထိုင်းနိုင်ငံထုတ်",
    deliveryDays: "ရက်အတွင်း ပို့ဆောင်",
    securePayment: "လုံခြုံစွာ ငွေပေးချေ",
    heroNote: "ချင်းမိုင်ရှိ မိသားစုစတူဒီယိုမှ ဖန်တီးထားသည်",
    marqueeOne: "လွတ်လပ်သော ထုတ်လုပ်သူများ",
    marqueeTwo: "သဘာဝပစ္စည်းများ",
    marqueeThree: "ထိုင်းနိုင်ငံတွင် ပြုလုပ်သည်",
    marqueeFour: "ဂရုတစိုက် ထုပ်ပိုးမှု",
    collectionEyebrow: "ပထမဆုံး စုစည်းမှု",
    collectionTitle: "သိမ်းထားသင့်သော ပစ္စည်းများ",
    filterAll: "အားလုံး",
    filterHome: "အိမ်သုံး",
    filterWear: "ဝတ်ဆင်ရန်",
    filterGifts: "လက်ဆောင်များ",
    filterFood: "အစားအစာ",
    storyEyebrow: "ပိုမိုရင်းနှီးသော ဈေးဝယ်ပုံ",
    storyTitle: "ဝယ်ယူမှုတိုင်းက လက်မှုပညာကို ဆက်လက်ရှင်သန်စေသည်။",
    storyBody:
      "ကျွန်ုပ်တို့သည် စတူဒီယိုငယ်များ၊ မိသားစုလုပ်ငန်းများနှင့် တိုက်ရိုက်လုပ်ကိုင်ပါသည်။ ထို့ကြောင့် ထုတ်လုပ်သူများအတွက် မျှတသောဈေးနှုန်း၊ ရိုးသားသောပစ္စည်းများနှင့် လူသားတစ်ဦး၏ ဇာတ်လမ်းပါရှိသော ပစ္စည်းများကို သင်ရရှိမည်ဖြစ်သည်။",
    meetMakers: "ကျွန်ုပ်တို့၏ ထုတ်လုပ်သူများကို သိရှိရန်",
    valueOneTitle: "အရေအတွက်နည်းနည်းဖြင့် ထုတ်လုပ်သည်",
    valueOneBody: "အလေအလွင့်နည်းပြီး ပိုမိုဂရုစိုက်ကာ အမည်မဲ့စက်ရုံလိုင်းများ မရှိပါ။",
    valueTwoTitle: "ဘဏ်ငွေလွှဲနည်းလမ်း မျိုးစုံ",
    valueTwoBody: "Thai QR၊ Myanmar QR သို့မဟုတ် crypto ငွေပေးချေမှုကို ရွေးပါ။",
    valueThreeTitle: "ရည်ရွယ်ချက်ရှိရှိ ထုပ်ပိုးသည်",
    valueThreeBody: "ပလတ်စတစ်အသုံးပြုမှု နည်းပါးပြီး လက်ဆောင်ပေးရန် သို့မဟုတ် ကိုယ်တိုင်သိမ်းရန် အသင့်ဖြစ်သည်။",
    footerLine: "ကောင်းသောပစ္စည်းများ။ ကောင်းသောဇာတ်လမ်းများ။ ဤနေရာတွင် ဖန်တီးသည်။",
    footerShop: "ဆိုင်",
    footerHelp: "အကူအညီ",
    contact: "ဆက်သွယ်ရန်",
    shipping: "ပို့ဆောင်ခြင်းနှင့် ပြန်အပ်ခြင်း",
    yourOrder: "သင့်မှာယူမှု",
    emptyTitle: "သင့်ဈေးခြင်းက စောင့်နေသည်",
    emptyBody: "ဂရုတစိုက် ပြုလုပ်ထားသော ပစ္စည်းတစ်ခု ထည့်ပါ။",
    continueShopping: "ဆက်လက် ဈေးဝယ်ရန်",
    subtotal: "ကုန်ပစ္စည်းစုစုပေါင်း",
    shippingAtCheckout: "ငွေပေးချေချိန်တွင် ပို့ဆောင်ခတွက်ချက်မည်",
    checkout: "ငွေပေးချေရန်",
    stepOne: "အဆင့် 1 / 3",
    stepTwo: "အဆင့် 2 / 3",
    deliveryDetails: "ပို့ဆောင်ရန် အချက်အလက်",
    fullName: "အမည်အပြည့်အစုံ",
    phone: "ဖုန်းနံပါတ်",
    email: "အီးမေးလ်",
    address: "လိပ်စာ",
    district: "မြို့နယ် / ခရိုင်",
    province: "ပြည်နယ် / တိုင်း",
    postcode: "စာတိုက်သင်္ကေတ",
    continuePayment: "ငွေပေးချေမှုသို့ ဆက်ရန်",
    scanPay: "ဘဏ်ငွေလွှဲခြင်း",
    scanInstructions: "ငွေပေးချေနည်းကို ရွေးပါ၊ QR ကို စကင်ဖတ်ပြီး ပြေစာတင်ပါ။",
    demoTitle: "ငွေပေးချေမှုကို ရောင်းသူ စစ်ဆေးမည်",
    demoBody: "ငွေမပေးမီ QR အချက်အလက်ကို စစ်ဆေးပါ။ ရောင်းသူက ပြေစာကို စစ်ဆေးမည်။",
    receiptTitle: "ငွေလွှဲပြေစာဓာတ်ပုံ တင်ပါ",
    receiptBrowse: "ပုံရွေးရန်",
    receiptHint: "ရောင်းသူ စစ်ဆေးနိုင်ရန် ဘဏ်ငွေလွှဲပြေစာကို တင်ပါ။",
    receiptEmpty: "ပြေစာ မတင်ရသေးပါ။",
    receiptPreparing: "ပြေစာကို ပြင်ဆင်နေပါသည်...",
    receiptReady: "ပြေစာကို ရောင်းသူစစ်ဆေးရန် အသင့်ဖြစ်ပါပြီ။",
    receiptRequired: "ပြေစာဓာတ်ပုံကို အရင်တင်ပါ။",
    receiptTooLarge: "ပြေစာပုံ အရွယ်အစားကြီးလွန်းပါသည်။ ပုံသေးသေးကို အသုံးပြုပါ။",
    receiptInvalid: "ပုံဖိုင်တစ်ခု တင်ပါ။",
    receiptStorageError: "ဤပြေစာကို စက်ထဲတွင် မသိမ်းနိုင်ပါ။ ပုံသေးသေးကို အသုံးပြုပါ။",
    submitReceipt: "ပြေစာကို စစ်ဆေးရန် ပို့ပါ",
    backDetails: "← ပို့ဆောင်ရန် အချက်အလက်သို့ ပြန်ရန်",
    paymentConfirmed: "ပြေစာ ပို့ပြီးပါပြီ",
    thankYou: "မှာယူသည့်အတွက် ကျေးဇူးတင်ပါသည်။",
    confirmationBody:
      "သင့်ပြေစာကို လက်ခံရရှိပါပြီ။ ရောင်းသူက admin dashboard မှ အတည်ပြုမည် သို့မဟုတ် ပယ်ချမည်။",
    orderNumber: "မှာယူမှုနံပါတ်",
    orderSummary: "မှာယူမှု အကျဉ်းချုပ်",
    delivery: "ပို့ဆောင်ခ",
    total: "စုစုပေါင်း",
    paymentTrust: "ငွေပေးချေမှုအခြေအနေကို သင့်ငွေပေးချေမှုဆာဗာက လုံခြုံစွာ စစ်ဆေးရမည်။",
    addedToCart: "ဈေးခြင်းထဲသို့ ထည့်ပြီး",
    soldOut: "ပစ္စည်းကုန်နေပါသည်",
  },
};

const supportedLanguages = ["en", "th", "mm"];
const savedLanguage = localStorage.getItem("talat-tai-language");
let language = supportedLanguages.includes(savedLanguage) ? savedLanguage : "en";
let activeFilter = "all";
let cart = JSON.parse(localStorage.getItem("talat-tai-cart") || "[]");
let toastTimer;
let uploadedReceipt = null;
let selectedPaymentMethod = "thai";

const elements = {
  customerLoginScreen: document.querySelector("#customerLoginScreen"),
  customerLoginForm: document.querySelector("#customerLoginForm"),
  customerLoginButton: document.querySelector("#customerLoginButton"),
  customerLoginStatus: document.querySelector("#customerLoginStatus"),
  customerAccount: document.querySelector("#customerAccount"),
  customerAccountEmail: document.querySelector("#customerAccountEmail"),
  customerLogoutButton: document.querySelector("#customerLogoutButton"),
  productGrid: document.querySelector("#productGrid"),
  cartButton: document.querySelector("#cartButton"),
  cartDrawer: document.querySelector("#cartDrawer"),
  drawerBackdrop: document.querySelector("#drawerBackdrop"),
  closeCart: document.querySelector("#closeCart"),
  cartCount: document.querySelector("#cartCount"),
  cartItems: document.querySelector("#cartItems"),
  emptyCart: document.querySelector("#emptyCart"),
  cartSummary: document.querySelector("#cartSummary"),
  cartSubtotal: document.querySelector("#cartSubtotal"),
  continueShopping: document.querySelector("#continueShopping"),
  checkoutButton: document.querySelector("#checkoutButton"),
  checkoutBackdrop: document.querySelector("#checkoutBackdrop"),
  checkoutModal: document.querySelector("#checkoutModal"),
  closeCheckout: document.querySelector("#closeCheckout"),
  customerForm: document.querySelector("#customerForm"),
  checkoutItems: document.querySelector("#checkoutItems"),
  checkoutSubtotal: document.querySelector("#checkoutSubtotal"),
  checkoutShipping: document.querySelector("#checkoutShipping"),
  checkoutTotal: document.querySelector("#checkoutTotal"),
  qrTotal: document.querySelector("#qrTotal"),
  qrCode: document.querySelector("#qrCode"),
  paymentQrImage: document.querySelector("#paymentQrImage"),
  paymentQrPlaceholder: document.querySelector("#paymentQrPlaceholder"),
  paymentMethodLabel: document.querySelector("#paymentMethodLabel"),
  paymentMethods: document.querySelector("#paymentMethods"),
  receiptInput: document.querySelector("#receiptUpload"),
  receiptPreview: document.querySelector("#receiptPreview"),
  receiptPreviewImage: document.querySelector("#receiptPreviewImage"),
  receiptFileName: document.querySelector("#receiptFileName"),
  receiptStatus: document.querySelector("#receiptStatus"),
  submitReceipt: document.querySelector("#submitReceipt"),
  backToDetails: document.querySelector("#backToDetails"),
  finishOrder: document.querySelector("#finishOrder"),
  orderNumber: document.querySelector("#orderNumber"),
  languageSelect: document.querySelector("#languageSelect"),
  toast: document.querySelector("#toast"),
};

function paymentMethodName(method) {
  const labels = {
    thai: "Thai QR",
    myanmar: "Myanmar QR",
    crypto: "Crypto Payment",
  };
  return STORE_CONFIG.paymentQr?.[method]?.label || labels[method] || "Bank Transfer";
}

function renderPaymentQr() {
  const paymentQr = STORE_CONFIG.paymentQr?.[selectedPaymentMethod] || {};
  const hasUploadedQr = Boolean(paymentQr.dataUrl);
  elements.paymentMethodLabel.textContent = paymentMethodName(selectedPaymentMethod);
  elements.paymentQrImage.hidden = !hasUploadedQr;
  elements.paymentQrPlaceholder.hidden = hasUploadedQr;
  elements.qrCode.classList.toggle("has-upload", hasUploadedQr);
  if (hasUploadedQr) {
    elements.paymentQrImage.src = paymentQr.dataUrl;
  } else {
    elements.paymentQrImage.removeAttribute("src");
  }
  elements.paymentMethods.querySelectorAll("[data-payment-method]").forEach((button) => {
    button.classList.toggle("active", button.dataset.paymentMethod === selectedPaymentMethod);
  });
}

function prefillCustomerForm() {
  if (!currentCustomer) return;
  const fields = elements.customerForm.elements;
  fields.name.value = currentCustomer.name || fields.name.value;
  fields.email.value = currentCustomer.email || fields.email.value;
}

function showCustomerStore() {
  const isSignedIn = Boolean(currentCustomer?.email);
  elements.customerLoginScreen.hidden = isSignedIn;
  elements.customerAccount.hidden = !isSignedIn;
  elements.customerAccountEmail.textContent = currentCustomer?.email || "";
  if (isSignedIn) prefillCustomerForm();
}

function money(value) {
  const locales = { en: "en-US", th: "th-TH", mm: "my-MM" };
  return `฿${new Intl.NumberFormat(locales[language], {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function text(key) {
  return translations[language][key] || key;
}

function productById(id) {
  return products.find((product) => product.id === id);
}

function localized(value) {
  return value?.[language] || value?.en || "";
}

function saveProducts() {
  localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
}

function syncCartWithProducts() {
  const originalLength = cart.length;
  cart = cart.filter((item) => productById(item.id));
  if (cart.length !== originalLength) {
    saveCart();
  }
}

function cartSubtotal() {
  return cart.reduce((total, item) => {
    const product = productById(item.id);
    return product ? total + product.price * item.quantity : total;
  }, 0);
}

function shippingCost() {
  const subtotal = cartSubtotal();
  if (subtotal === 0) return 0;
  return subtotal >= STORE_CONFIG.freeShippingAt ? 0 : STORE_CONFIG.shippingFee;
}

function cartTotal() {
  return cartSubtotal() + shippingCost();
}

function saveCart() {
  localStorage.setItem("talat-tai-cart", JSON.stringify(cart));
}

function renderProducts() {
  const visibleProducts = products.filter((product) => {
    const categories = Array.isArray(product.category) ? product.category : [product.category];
    return product.active !== false && (activeFilter === "all" || categories.includes(activeFilter));
  });

  elements.productGrid.innerHTML = visibleProducts
    .map(
      (product, index) => {
        const isSoldOut = Number(product.stock) <= 0;
        return `
        <article class="product-card" style="animation-delay:${index * 60}ms">
          <div class="product-image${product.image?.dataUrl ? " has-photo" : ""}" style="--image-bg:${product.background};--object-color:${product.color}">
            <span class="product-badge">${isSoldOut ? text("soldOut") : localized(product.badge)}</span>
            ${product.image?.dataUrl
              ? `<img class="product-photo" src="${product.image.dataUrl}" alt="${localized(product.name)}" />`
              : `<div class="product-object object-${product.shape}" aria-hidden="true"></div>`}
            <button class="quick-add" data-add-product="${product.id}" type="button"
              aria-label="Add ${localized(product.name)} to cart" ${isSoldOut ? "disabled" : ""}>+</button>
          </div>
          <div class="product-details">
            <div>
              <h3>${localized(product.name)}</h3>
              <p>${localized(product.maker)}</p>
            </div>
            <strong>${money(product.price)}</strong>
          </div>
        </article>
      `;
      },
    )
    .join("");
}

function renderCart() {
  syncCartWithProducts();
  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
  elements.cartCount.textContent = itemCount;
  elements.emptyCart.hidden = cart.length > 0;
  elements.cartItems.hidden = cart.length === 0;
  elements.cartSummary.hidden = cart.length === 0;
  elements.cartSubtotal.textContent = money(cartSubtotal());

  elements.cartItems.innerHTML = cart
    .map((item) => {
      const product = productById(item.id);
      return `
        <article class="cart-item">
          <div class="cart-thumb" style="--thumb-bg:${product.background};--thumb-color:${product.color}">
            ${product.image?.dataUrl
              ? `<img src="${product.image.dataUrl}" alt="${localized(product.name)}" />`
              : `<span></span>`}
          </div>
          <div>
            <h3>${localized(product.name)}</h3>
            <p>${money(product.price)}</p>
            <div class="quantity-control" aria-label="Quantity">
              <button type="button" data-quantity="${product.id}" data-change="-1" aria-label="Decrease">−</button>
              <span>${item.quantity}</span>
              <button type="button" data-quantity="${product.id}" data-change="1" aria-label="Increase">+</button>
            </div>
          </div>
          <button class="remove-item" type="button" data-remove="${product.id}" aria-label="Remove">×</button>
        </article>
      `;
    })
    .join("");

  renderCheckoutSummary();
}

function renderCheckoutSummary() {
  elements.checkoutItems.innerHTML = cart
    .map((item) => {
      const product = productById(item.id);
      if (!product) return "";
      return `
        <div class="checkout-summary-item">
          <div class="summary-thumb" style="--thumb-bg:${product.background};--thumb-color:${product.color}">
            ${product.image?.dataUrl
              ? `<img src="${product.image.dataUrl}" alt="${localized(product.name)}" />`
              : `<span></span>`}
            <span class="summary-quantity">${item.quantity}</span>
          </div>
          <div>
            <p>${localized(product.name)}</p>
            <small>${localized(product.maker)}</small>
          </div>
          <strong>${money(product.price * item.quantity)}</strong>
        </div>
      `;
    })
    .join("");

  elements.checkoutSubtotal.textContent = money(cartSubtotal());
  const freeShipping = language === "th" ? "ฟรี" : language === "mm" ? "အခမဲ့" : "Free";
  elements.checkoutShipping.textContent =
    shippingCost() === 0 && cart.length > 0 ? freeShipping : money(shippingCost());
  elements.checkoutTotal.textContent = money(cartTotal());
  elements.qrTotal.textContent = money(cartTotal());
}

function addToCart(id) {
  const product = productById(id);
  if (!product) return;
  if (Number(product.stock) <= 0) {
    showToast(`${localized(product.name)} ${text("soldOut")}`);
    return;
  }
  const existing = cart.find((item) => item.id === id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ id, quantity: 1 });
  }
  saveCart();
  renderCart();
  showToast(`${localized(product.name)} ${text("addedToCart")}`);
}

function changeQuantity(id, change) {
  const item = cart.find((entry) => entry.id === id);
  if (!item) return;
  item.quantity += change;
  if (item.quantity <= 0) {
    cart = cart.filter((entry) => entry.id !== id);
  }
  saveCart();
  renderCart();
}

function removeFromCart(id) {
  cart = cart.filter((item) => item.id !== id);
  saveCart();
  renderCart();
}

function openCart() {
  elements.cartDrawer.classList.add("open");
  elements.drawerBackdrop.classList.add("open");
  elements.cartDrawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("locked");
}

function closeCart() {
  elements.cartDrawer.classList.remove("open");
  elements.drawerBackdrop.classList.remove("open");
  elements.cartDrawer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("locked");
}

function openCheckout() {
  closeCart();
  prefillCustomerForm();
  renderPaymentQr();
  showCheckoutStep(1);
  renderCheckoutSummary();
  elements.checkoutModal.classList.add("open");
  elements.checkoutBackdrop.classList.add("open");
  elements.checkoutModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("locked");
}

function closeCheckout() {
  elements.checkoutModal.classList.remove("open");
  elements.checkoutBackdrop.classList.remove("open");
  elements.checkoutModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("locked");
}

function showCheckoutStep(step) {
  document.querySelectorAll("[data-checkout-step]").forEach((element) => {
    element.classList.toggle("active", Number(element.dataset.checkoutStep) === step);
  });
  document.querySelectorAll(".progress-step").forEach((element) => {
    element.classList.toggle("active", Number(element.dataset.step) <= step);
  });
  document.querySelector(".checkout-main").scrollTop = 0;
}

function resetReceiptUpload() {
  uploadedReceipt = null;
  elements.receiptInput.value = "";
  elements.receiptPreview.hidden = true;
  elements.receiptPreviewImage.removeAttribute("src");
  elements.receiptFileName.textContent = "";
  elements.receiptStatus.textContent = text("receiptEmpty");
  elements.submitReceipt.disabled = true;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", reject);
    reader.readAsDataURL(file);
  });
}

function compressReceiptImage(dataUrl, fileName, originalSize) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => {
      const maxSize = 1100;
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(image, 0, 0, width, height);
      const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.78);
      resolve({
        dataUrl: compressedDataUrl,
        name: fileName,
        type: "image/jpeg",
        originalSize,
        storedSize: compressedDataUrl.length,
        uploadedAt: new Date().toISOString(),
      });
    });
    image.addEventListener("error", reject);
    image.src = dataUrl;
  });
}

async function handleReceiptUpload(file) {
  if (!file) {
    resetReceiptUpload();
    return;
  }

  if (!file.type.startsWith("image/")) {
    resetReceiptUpload();
    showToast(text("receiptInvalid"));
    return;
  }

  if (file.size > 6 * 1024 * 1024) {
    resetReceiptUpload();
    showToast(text("receiptTooLarge"));
    return;
  }

  try {
    elements.receiptStatus.textContent = text("receiptPreparing");
    const dataUrl = await readFileAsDataUrl(file);
    uploadedReceipt = await compressReceiptImage(dataUrl, file.name, file.size);
    if (uploadedReceipt.storedSize > 2.5 * 1024 * 1024) {
      resetReceiptUpload();
      showToast(text("receiptTooLarge"));
      return;
    }
    elements.receiptPreviewImage.src = uploadedReceipt.dataUrl;
    elements.receiptFileName.textContent = uploadedReceipt.name;
    elements.receiptPreview.hidden = false;
    elements.receiptStatus.textContent = text("receiptReady");
    elements.submitReceipt.disabled = false;
  } catch {
    resetReceiptUpload();
    showToast(text("receiptInvalid"));
  }
}

async function createPayment() {
  lastCustomerDetails = {
    ...(currentCustomer || {}),
    ...Object.fromEntries(new FormData(elements.customerForm)),
  };
  if (STORE_CONFIG.paymentMode === "demo") {
    showCheckoutStep(2);
    return;
  }

  const response = await fetch(STORE_CONFIG.createChargeEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customer: lastCustomerDetails,
      items: cart,
      expectedAmount: cartTotal(),
    }),
  });

  if (!response.ok) {
    throw new Error("Unable to create payment");
  }

  const payment = await response.json();
  // In production, render payment.qrImage or payment.qrPayload here and poll only
  // a server-owned order status. Never trust a browser-only "paid" button.
  console.info("Payment created", payment.id);
  showCheckoutStep(2);
}

async function completeDemoOrder() {
  if (!uploadedReceipt) {
    showToast(text("receiptRequired"));
    return;
  }
  const timestamp = Date.now().toString().slice(-6);
  const reference = `TT-${timestamp}`;
  elements.orderNumber.textContent = reference;
  try {
    await saveOrder(reference, uploadedReceipt);
  } catch (error) {
    showToast(error.message || text("receiptStorageError"));
    return;
  }
  showCheckoutStep(3);
}

async function saveOrder(reference, receipt) {
  const orderItems = cart
    .map((item) => {
      const product = productById(item.id);
      if (!product) return null;
      return {
        id: product.id,
        name: cloneData(product.name),
        maker: cloneData(product.maker),
        price: product.price,
        quantity: item.quantity,
        total: product.price * item.quantity,
      };
    })
    .filter(Boolean);

  if (CLOUD.enabled) {
    await CLOUD.createOrder({
      reference,
      receipt,
      customer: lastCustomerDetails,
      paymentMethodKey: selectedPaymentMethod,
      language,
      items: orderItems,
    });
    products = await CLOUD.getProducts();
    renderProducts();
    return;
  }

  const orders = readJson(ORDERS_STORAGE_KEY, []);

  orders.unshift({
    reference,
    createdAt: new Date().toISOString(),
    status: "receipt_submitted",
    paymentStatus: "pending_review",
    fulfillmentStatus: "payment_review",
    paymentMethod: paymentMethodName(selectedPaymentMethod),
    paymentMethodKey: selectedPaymentMethod,
    receipt,
    customer: lastCustomerDetails,
    items: orderItems,
    subtotal: cartSubtotal(),
    shipping: shippingCost(),
    total: cartTotal(),
    currency: STORE_CONFIG.currency,
    language,
    stockAdjusted: true,
  });

  products = products.map((product) => {
    const orderItem = cart.find((item) => item.id === product.id);
    if (!orderItem || typeof product.stock !== "number") return product;
    return { ...product, stock: Math.max(0, product.stock - orderItem.quantity) };
  });

  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  saveProducts();
}

function resetOrder() {
  cart = [];
  saveCart();
  renderProducts();
  renderCart();
  elements.customerForm.reset();
  prefillCustomerForm();
  resetReceiptUpload();
  closeCheckout();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function applyLanguage() {
  document.documentElement.lang = language;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    if (translations[language][key]) {
      element.innerHTML = translations[language][key];
    }
  });
  elements.languageSelect.value = language;
  localStorage.setItem("talat-tai-language", language);
  renderProducts();
  renderCart();
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2200);
}

elements.customerLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const details = Object.fromEntries(new FormData(event.currentTarget));
  if (CLOUD.enabled) {
    elements.customerLoginButton.disabled = true;
    elements.customerLoginStatus.textContent = text("customerLoginSending");
    try {
      await CLOUD.sendMagicLink(details.email.trim().toLowerCase(), details.name.trim());
      elements.customerLoginStatus.textContent = text("customerLoginSent");
    } catch (error) {
      elements.customerLoginStatus.textContent = error.message;
    } finally {
      elements.customerLoginButton.disabled = false;
    }
    return;
  }
  currentCustomer = {
    name: details.name.trim(),
    email: details.email.trim().toLowerCase(),
    signedInAt: new Date().toISOString(),
  };
  localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(currentCustomer));
  showCustomerStore();
});

elements.customerLogoutButton.addEventListener("click", async () => {
  if (CLOUD.enabled) await CLOUD.signOut();
  currentCustomer = null;
  lastCustomerDetails = {};
  localStorage.removeItem(CUSTOMER_STORAGE_KEY);
  elements.customerLoginForm.reset();
  showCustomerStore();
});

elements.paymentMethods.addEventListener("click", (event) => {
  const button = event.target.closest("[data-payment-method]");
  if (!button) return;
  selectedPaymentMethod = button.dataset.paymentMethod;
  renderPaymentQr();
});

document.querySelector("#filterRow").addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  activeFilter = button.dataset.filter;
  document.querySelectorAll(".filter").forEach((filter) => filter.classList.remove("active"));
  button.classList.add("active");
  renderProducts();
});

elements.productGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add-product]");
  if (button) addToCart(button.dataset.addProduct);
});

elements.cartItems.addEventListener("click", (event) => {
  const quantityButton = event.target.closest("[data-quantity]");
  const removeButton = event.target.closest("[data-remove]");
  if (quantityButton) {
    changeQuantity(quantityButton.dataset.quantity, Number(quantityButton.dataset.change));
  }
  if (removeButton) {
    removeFromCart(removeButton.dataset.remove);
  }
});

elements.cartButton.addEventListener("click", openCart);
elements.closeCart.addEventListener("click", closeCart);
elements.drawerBackdrop.addEventListener("click", closeCart);
elements.continueShopping.addEventListener("click", closeCart);
elements.checkoutButton.addEventListener("click", openCheckout);
elements.closeCheckout.addEventListener("click", closeCheckout);
elements.checkoutBackdrop.addEventListener("click", closeCheckout);
elements.backToDetails.addEventListener("click", () => showCheckoutStep(1));
elements.receiptInput.addEventListener("change", (event) => {
  handleReceiptUpload(event.target.files[0]);
});
elements.submitReceipt.addEventListener("click", completeDemoOrder);
elements.finishOrder.addEventListener("click", resetOrder);
elements.languageSelect.addEventListener("change", (event) => {
  language = event.target.value;
  applyLanguage();
});

elements.customerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = elements.customerForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  try {
    await createPayment();
  } catch (error) {
    showToast(error.message);
  } finally {
    submitButton.disabled = false;
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (elements.checkoutModal.classList.contains("open")) {
    closeCheckout();
  } else {
    closeCart();
  }
});

async function initializeStorefront() {
  if (CLOUD.enabled) {
    try {
      const [cloudProducts, cloudSettings, session] = await Promise.all([
        CLOUD.getProducts(),
        CLOUD.getSettings(),
        CLOUD.getSession(),
      ]);
      products = cloudProducts;
      Object.assign(STORE_CONFIG, cloudSettings);
      currentCustomer = session
        ? {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name || "",
          }
        : null;
    } catch (error) {
      currentCustomer = null;
      showToast(`Cloud connection: ${error.message}`);
    }
  }

  applyBrand();
  document.querySelector("#year").textContent = new Date().getFullYear();
  applyLanguage();
  renderPaymentQr();
  showCustomerStore();
}

function applyBrand() {
  let brand = {};
  try {
    brand = JSON.parse(localStorage.getItem(BRAND_STORAGE_KEY)) || {};
  } catch {
    brand = {};
  }

  // Apply CSS color variables
  const colors = brand.colors || {};
  const colorMap = {
    green: "--green",
    gold: "--gold",
    paper: "--paper",
    ink: "--ink",
    terracotta: "--terracotta",
  };
  Object.entries(colorMap).forEach(([key, cssVar]) => {
    if (colors[key]) {
      document.documentElement.style.setProperty(cssVar, colors[key]);
    }
  });

  // Apply logo to all brand logo images
  if (brand.logoDataUrl) {
    document.querySelectorAll(".brand-logo, .empty-logo").forEach((img) => {
      img.src = brand.logoDataUrl;
    });
  }

  // Apply store name to all brand name spans
  if (brand.storeName) {
    document.querySelectorAll(".brand span, .brand-light span").forEach((el) => {
      el.textContent = brand.storeName;
    });
    document.title = brand.storeName + " | Thoughtful goods from Thailand";
    const copyrightEl = document.querySelector(".copyright");
    if (copyrightEl) {
      copyrightEl.innerHTML = `© <span id="year"></span> ${brand.storeName}`;
    }
  }

  // Apply contact email
  if (brand.contactEmail) {
    document.querySelectorAll("a[href^='mailto:']").forEach((a) => {
      a.href = `mailto:${brand.contactEmail}`;
    });
  }

  // Merge brand texts into translations (overrides defaults)
  if (brand.texts) {
    Object.keys(translations).forEach((lang) => {
      if (brand.texts[lang]) {
        Object.assign(translations[lang], brand.texts[lang]);
      }
    });
  }
}

initializeStorefront();
