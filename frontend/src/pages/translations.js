// ============================================================
// TAXSKY TRANSLATIONS
// ============================================================
// Supports: English (en), Vietnamese (vi), Spanish (es)
// ============================================================

const translations = {
  // ============================================================
  // ENGLISH
  // ============================================================
  en: {
    // Common
    loading: "Loading...",
    save: "Save",
    cancel: "Cancel",
    back: "← Back",
    continue: "Continue →",
    done: "Done",
    yes: "Yes",
    no: "No",
    edit: "Edit",
    delete: "Delete",
    download: "Download",
    upload: "Upload",
    submit: "Submit",
    close: "Close",
    
    // Navigation
    nav: {
      overview: "Overview",
      taxDetails: "Tax Details",
      profile: "Profile",
      documents: "Documents",
      downloads: "Downloads",
      history: "History",
      settings: "Settings",
    },
    
    // Dashboard
    dashboard: {
      title: "Tax Dashboard",
      welcome: "Welcome",
      taxYear: "Tax Year",
      estimatedRefund: "Estimated Total Refund",
      amountOwed: "Amount You Owe",
      federal: "Federal",
      state: "California",
      fileNow: "📋 File Now",
      goToTaxChat: "💬 Go to Tax Chat",
      
      // Stats
      totalIncome: "Total Income",
      totalTax: "Total Tax",
      withheld: "Withheld",
      dependents: "Dependents",
      
      // Federal Breakdown
      federalBreakdown: "🇺🇸 Federal Tax Breakdown",
      w2Wages: "W-2 Wages",
      nec1099: "1099-NEC",
      standardDeduction: "Standard Deduction",
      taxableIncome: "Taxable Income",
      federalTax: "Federal Tax",
      
      // CA Breakdown
      caBreakdown: "🌴 California Tax Breakdown",
      caAgi: "CA AGI",
      caDeduction: "CA Deduction",
      caTaxable: "CA Taxable",
      caTax: "CA Tax",
      calEitc: "CalEITC",
      youngChildCredit: "Young Child Credit",
      caWithheld: "CA Withheld",
      
      // Status
      refund: "Refund",
      owed: "Owed",
      
      // Profile Section
      personalInfo: "👤 Personal Information",
      fullName: "Full Name",
      ssn: "SSN",
      address: "Address",
      filingStatus: "Filing Status",
      
      // Documents
      uploadedDocs: "📄 Uploaded Documents",
      noDocs: "No documents uploaded yet",
      uploadInChat: "Upload in Tax Chat",
      processed: "Processed",
      
      // Downloads
      downloadForms: "📥 Download Tax Forms",
      form1040: "Form 1040",
      form1040Desc: "U.S. Individual Income Tax Return",
      downloadPdf: "Download PDF",
      ca540: "CA Form 540",
      ca540Desc: "California Resident Income Tax Return",
      comingSoon: "Coming Soon",
      
      // History
      taxHistory: "📜 Tax History",
      filed: "Filed",
      inProgress: "In Progress",
      notStarted: "Not Started",
      
      // Settings
      settingsTitle: "⚙️ Settings",
      language: "Language",
      languageDesc: "Select your preferred language",
      notifications: "Email Notifications",
      notificationsDesc: "Receive updates about your tax return",
      autoSave: "Auto-Save",
      autoSaveDesc: "Automatically save your progress",
      logout: "🚪 Logout",
    },
    
    // Submit Flow
    submitFlow: {
      title: "📋 File Your Tax Return",
      
      // Steps
      step1: "Review Info",
      step2: "Verify Income",
      step3: "Check Refund",
      step4: "Confirm & Sign",
      step5: "Complete",
      
      // Step 1
      reviewPersonal: "👤 Review Personal Information",
      reviewFiling: "📋 Filing Information",
      reviewSpouse: "👫 Spouse Information",
      reviewDependents: "👨‍👩‍👧‍👦 Dependents",
      missingInfo: "⚠️ Missing Information",
      fixBeforeContinue: "Please fix the following before continuing:",
      editInfo: "Edit Information",
      saveChanges: "Save Changes",
      
      // Step 2
      verifyIncome: "💰 Verify Your Income",
      incomeW2: "W-2 Income",
      income1099: "1099-NEC (Self-Employment)",
      incomeInterest: "Interest Income",
      incomeDividends: "Dividend Income",
      incomeOther: "Other Income",
      totalIncome: "Total Income",
      
      // Step 3
      taxResults: "🎯 Your Tax Results",
      yourEstimatedRefund: "💰 Your Estimated Refund",
      amountYouOwe: "💸 Amount You Owe",
      taxOwed: "Tax Owed",
      childTaxCredit: "Child Tax Credit",
      
      // Step 4
      reviewConfirm: "✍️ Review & Confirm",
      filingChecklist: "✅ Filing Checklist",
      checkPersonal: "Personal information is correct",
      checkFiling: "Filing status selected",
      checkIncome: "Income reported",
      checkWithholding: "Withholdings entered",
      checkDependents: "Dependents information complete",
      declaration: "Declaration",
      declarationText: "Under penalties of perjury, I declare that I have examined this return and accompanying schedules and statements, and to the best of my knowledge and belief, they are true, correct, and complete.",
      filingMethod: "Filing Method: Print & Mail",
      filingMethodDesc: "Your Form 1040 will be downloaded as a PDF. Print it, sign it, and mail it to the IRS.",
      efileComingSoon: "🔜 E-file integration coming soon!",
      downloadComplete: "📥 Download & Complete",
      generating: "⏳ Generating...",
      
      // Step 5
      taxReturnReady: "🎉 Tax Return Ready!",
      form1040Downloaded: "Your Form 1040 has been downloaded.",
      nextSteps: "📋 Next Steps:",
      step1Print: "Print your Form 1040 (all pages)",
      step2Sign: "Sign and date the form",
      step3Attach: "Attach W-2 forms",
      step4Mail: "Mail to the IRS address below",
      irsAddress: "📮 IRS Mailing Address (California - Refund):",
      irsAddressOwed: "* If you owe taxes, use:",
      caReturnNotice: "🌴 California State Return:",
      caReturnText: "You also need to file CA Form 540 with the Franchise Tax Board.",
      ca540ComingSoon: "🔜 CA 540 PDF generation coming soon!",
      expectedRefund: "💰 Expected Refund:",
      processingTime: "Allow 6-8 weeks for processing (paper filing)",
    },
    
    // Tax Chat
    taxChat: {
      title: "TaxSky AI",
      placeholder: "Type your message...",
      uploadDoc: "Upload W-2 or 1099",
      send: "Send",
      thinking: "Thinking...",
      welcome: "👋 Hi! I'm TaxSky AI, your personal tax assistant.",
      askName: "What's your name?",
    },
    
    // Filing Status Options
    filingStatus: {
      single: "Single",
      married_filing_jointly: "Married Filing Jointly",
      married_filing_separately: "Married Filing Separately",
      head_of_household: "Head of Household",
      qualifying_surviving_spouse: "Qualifying Surviving Spouse",
    },
    
    // Errors & Validation
    errors: {
      required: "This field is required",
      invalidSSN: "Invalid SSN format",
      invalidZip: "Invalid ZIP code",
      noIncome: "Please enter your income",
      sessionExpired: "Session expired. Please login again.",
    },
  },
  
  // ============================================================
  // VIETNAMESE
  // ============================================================
  vi: {
    // Common
    loading: "Đang tải...",
    save: "Lưu",
    cancel: "Hủy",
    back: "← Quay lại",
    continue: "Tiếp tục →",
    done: "Xong",
    yes: "Có",
    no: "Không",
    edit: "Sửa",
    delete: "Xóa",
    download: "Tải xuống",
    upload: "Tải lên",
    submit: "Gửi",
    close: "Đóng",
    
    // Navigation
    nav: {
      overview: "Tổng quan",
      taxDetails: "Chi tiết thuế",
      profile: "Hồ sơ",
      documents: "Tài liệu",
      downloads: "Tải xuống",
      history: "Lịch sử",
      settings: "Cài đặt",
    },
    
    // Dashboard
    dashboard: {
      title: "Bảng điều khiển Thuế",
      welcome: "Xin chào",
      taxYear: "Năm thuế",
      estimatedRefund: "Ước tính Hoàn Thuế",
      amountOwed: "Số Tiền Nợ",
      federal: "Liên bang",
      state: "California",
      fileNow: "📋 Nộp Ngay",
      goToTaxChat: "💬 Chat với AI",
      
      // Stats
      totalIncome: "Tổng Thu Nhập",
      totalTax: "Tổng Thuế",
      withheld: "Đã Khấu Trừ",
      dependents: "Người Phụ Thuộc",
      
      // Federal Breakdown
      federalBreakdown: "🇺🇸 Chi Tiết Thuế Liên Bang",
      w2Wages: "Lương W-2",
      nec1099: "1099-NEC",
      standardDeduction: "Khấu Trừ Tiêu Chuẩn",
      taxableIncome: "Thu Nhập Chịu Thuế",
      federalTax: "Thuế Liên Bang",
      
      // CA Breakdown
      caBreakdown: "🌴 Chi Tiết Thuế California",
      caAgi: "CA AGI",
      caDeduction: "Khấu Trừ CA",
      caTaxable: "Thu Nhập Chịu Thuế CA",
      caTax: "Thuế CA",
      calEitc: "CalEITC",
      youngChildCredit: "Tín Dụng Trẻ Em",
      caWithheld: "Đã Khấu Trừ CA",
      
      // Status
      refund: "Hoàn thuế",
      owed: "Nợ thuế",
      
      // Profile Section
      personalInfo: "👤 Thông Tin Cá Nhân",
      fullName: "Họ và Tên",
      ssn: "Số An Sinh",
      address: "Địa Chỉ",
      filingStatus: "Tình Trạng Khai Thuế",
      
      // Documents
      uploadedDocs: "📄 Tài Liệu Đã Tải",
      noDocs: "Chưa có tài liệu nào",
      uploadInChat: "Tải lên trong Chat",
      processed: "Đã xử lý",
      
      // Downloads
      downloadForms: "📥 Tải Biểu Mẫu Thuế",
      form1040: "Mẫu 1040",
      form1040Desc: "Tờ Khai Thuế Thu Nhập Cá Nhân Hoa Kỳ",
      downloadPdf: "Tải PDF",
      ca540: "Mẫu CA 540",
      ca540Desc: "Tờ Khai Thuế Thu Nhập Cư Dân California",
      comingSoon: "Sắp Ra Mắt",
      
      // History
      taxHistory: "📜 Lịch Sử Thuế",
      filed: "Đã nộp",
      inProgress: "Đang xử lý",
      notStarted: "Chưa bắt đầu",
      
      // Settings
      settingsTitle: "⚙️ Cài Đặt",
      language: "Ngôn ngữ",
      languageDesc: "Chọn ngôn ngữ của bạn",
      notifications: "Thông báo Email",
      notificationsDesc: "Nhận cập nhật về tờ khai thuế",
      autoSave: "Tự động lưu",
      autoSaveDesc: "Tự động lưu tiến trình",
      logout: "🚪 Đăng xuất",
    },
    
    // Submit Flow
    submitFlow: {
      title: "📋 Nộp Tờ Khai Thuế",
      
      // Steps
      step1: "Xem xét",
      step2: "Thu nhập",
      step3: "Hoàn thuế",
      step4: "Xác nhận",
      step5: "Hoàn tất",
      
      // Step 1
      reviewPersonal: "👤 Xem Xét Thông Tin Cá Nhân",
      reviewFiling: "📋 Thông Tin Khai Thuế",
      reviewSpouse: "👫 Thông Tin Vợ/Chồng",
      reviewDependents: "👨‍👩‍👧‍👦 Người Phụ Thuộc",
      missingInfo: "⚠️ Thiếu Thông Tin",
      fixBeforeContinue: "Vui lòng hoàn thành các mục sau:",
      editInfo: "Sửa Thông Tin",
      saveChanges: "Lưu Thay Đổi",
      
      // Step 2
      verifyIncome: "💰 Xác Nhận Thu Nhập",
      incomeW2: "Thu Nhập W-2",
      income1099: "1099-NEC (Tự Kinh Doanh)",
      incomeInterest: "Thu Nhập Lãi Suất",
      incomeDividends: "Thu Nhập Cổ Tức",
      incomeOther: "Thu Nhập Khác",
      totalIncome: "Tổng Thu Nhập",
      
      // Step 3
      taxResults: "🎯 Kết Quả Thuế",
      yourEstimatedRefund: "💰 Ước Tính Hoàn Thuế",
      amountYouOwe: "💸 Số Tiền Bạn Nợ",
      taxOwed: "Thuế Phải Nộp",
      childTaxCredit: "Tín Dụng Trẻ Em",
      
      // Step 4
      reviewConfirm: "✍️ Xem Xét & Xác Nhận",
      filingChecklist: "✅ Danh Sách Kiểm Tra",
      checkPersonal: "Thông tin cá nhân chính xác",
      checkFiling: "Đã chọn tình trạng khai thuế",
      checkIncome: "Đã khai thu nhập",
      checkWithholding: "Đã nhập khấu trừ",
      checkDependents: "Thông tin người phụ thuộc đầy đủ",
      declaration: "Cam Kết",
      declarationText: "Tôi cam đoan rằng tờ khai này và các biểu mẫu đính kèm là đúng sự thật và đầy đủ theo hiểu biết tốt nhất của tôi.",
      filingMethod: "Phương thức: In & Gửi thư",
      filingMethodDesc: "Mẫu 1040 sẽ được tải xuống dạng PDF. In ra, ký tên và gửi đến IRS.",
      efileComingSoon: "🔜 Nộp điện tử sắp ra mắt!",
      downloadComplete: "📥 Tải & Hoàn Tất",
      generating: "⏳ Đang tạo...",
      
      // Step 5
      taxReturnReady: "🎉 Tờ Khai Thuế Đã Sẵn Sàng!",
      form1040Downloaded: "Mẫu 1040 đã được tải xuống.",
      nextSteps: "📋 Các Bước Tiếp Theo:",
      step1Print: "In Mẫu 1040 (tất cả các trang)",
      step2Sign: "Ký và ghi ngày",
      step3Attach: "Đính kèm mẫu W-2",
      step4Mail: "Gửi đến địa chỉ IRS bên dưới",
      irsAddress: "📮 Địa Chỉ IRS (California - Hoàn thuế):",
      irsAddressOwed: "* Nếu bạn nợ thuế, gửi đến:",
      caReturnNotice: "🌴 Tờ Khai California:",
      caReturnText: "Bạn cũng cần nộp Mẫu CA 540 cho Franchise Tax Board.",
      ca540ComingSoon: "🔜 Tạo PDF CA 540 sắp ra mắt!",
      expectedRefund: "💰 Hoàn Thuế Dự Kiến:",
      processingTime: "Thời gian xử lý 6-8 tuần (gửi giấy)",
    },
    
    // Tax Chat
    taxChat: {
      title: "TaxSky AI",
      placeholder: "Nhập tin nhắn...",
      uploadDoc: "Tải W-2 hoặc 1099",
      send: "Gửi",
      thinking: "Đang suy nghĩ...",
      welcome: "👋 Xin chào! Tôi là TaxSky AI, trợ lý thuế của bạn.",
      askName: "Tên bạn là gì?",
    },
    
    // Filing Status Options
    filingStatus: {
      single: "Độc thân",
      married_filing_jointly: "Vợ Chồng Khai Chung",
      married_filing_separately: "Vợ Chồng Khai Riêng",
      head_of_household: "Chủ Hộ",
      qualifying_surviving_spouse: "Góa Phụ/Phu Đủ Điều Kiện",
    },
    
    // Errors & Validation
    errors: {
      required: "Trường này bắt buộc",
      invalidSSN: "Số An Sinh không hợp lệ",
      invalidZip: "Mã ZIP không hợp lệ",
      noIncome: "Vui lòng nhập thu nhập",
      sessionExpired: "Phiên đã hết hạn. Vui lòng đăng nhập lại.",
    },
  },
  
  // ============================================================
  // SPANISH (Basic - can expand later)
  // ============================================================
  es: {
    // Common
    loading: "Cargando...",
    save: "Guardar",
    cancel: "Cancelar",
    back: "← Atrás",
    continue: "Continuar →",
    done: "Hecho",
    yes: "Sí",
    no: "No",
    
    // Dashboard
    dashboard: {
      title: "Panel de Impuestos",
      welcome: "Bienvenido",
      estimatedRefund: "Reembolso Estimado",
      totalIncome: "Ingreso Total",
      totalTax: "Impuesto Total",
      withheld: "Retenido",
      federal: "Federal",
      state: "California",
      fileNow: "📋 Presentar Ahora",
      refund: "Reembolso",
      owed: "Adeudado",
    },
    
    // Add more Spanish translations as needed...
  },
};

// ============================================================
// HELPER FUNCTION
// ============================================================
export function t(key, lang = 'en') {
  const keys = key.split('.');
  let value = translations[lang];
  
  for (const k of keys) {
    if (value && value[k] !== undefined) {
      value = value[k];
    } else {
      // Fallback to English
      value = translations['en'];
      for (const fallbackKey of keys) {
        if (value && value[fallbackKey] !== undefined) {
          value = value[fallbackKey];
        } else {
          return key; // Return key if not found
        }
      }
      break;
    }
  }
  
  return value;
}

// Get all translations for a language
export function getTranslations(lang = 'en') {
  return translations[lang] || translations['en'];
}

// Get available languages
export function getLanguages() {
  return [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'es', name: 'Español', flag: '🇲🇽' },
  ];
}

export default translations;
