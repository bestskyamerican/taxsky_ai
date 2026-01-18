// ============================================================
// i18n.js - MASTER TRANSLATIONS FOR TAXSKY (Frontend + Backend)
// ============================================================
// Location: backend/services/i18n.js (shared with frontend)
// Supports: English (en), Vietnamese (vi), Spanish (es)
// ============================================================

export const SUPPORTED_LANGUAGES = ['en', 'vi', 'es'];

export const translations = {
  // ============================================================
  // ENGLISH
  // ============================================================
  en: {
    // ==================== SYSTEM PROMPTS (for AI) ====================
    system: {
      languageInstruction: "You MUST respond in ENGLISH only. All messages, questions, and responses must be in English.",
      extractionReminder: "ALWAYS extract data from user messages into the 'extracted' field"
    },

    // ==================== TOP-LEVEL MESSAGES (for smartPromptService) ====================
    welcome: "👋 Hi! I'm TaxSky AI, your personal tax assistant. What's your name?",
    welcomeBack: "👋 Welcome back",
    niceMeet: "Nice to meet you, {name}! Ready to file your {year} taxes?",
    uploadPrompt: "📤 Upload your W-2 or 1099 and I'll extract everything automatically!",
    uploadSuccess: "✅ {formType} uploaded successfully!",
    confirmInfo: "Is this information correct?",
    
    // Filing status options (top-level for prompts)
    single: "Single",
    mfj: "Married Filing Jointly",
    mfs: "Married Filing Separately",
    hoh: "Head of Household",
    
    // Interview questions
    askFilingStatus: "What is your filing status?",
    askDependents: "Do you have any dependents?",
    askDependentCount: "How many dependents do you have?",
    askSpouseInfo: "Please provide your spouse's information.",

    // ==================== SUMMARY (for tax summary display) ====================
    summary: {
      title: "📊 **{year} Tax Summary**",
      federal: "**Federal:**",
      state: "**State",
      total: "TOTAL",
      taxable: "Taxable Income",
      tax: "Tax",
      withheld: "Withheld",
      ctc: "👶 Child Tax Credit",
      refund: "Refund",
      owed: "Owed",
      generate: "Would you like me to generate your Form 1040?"
    },

    // ==================== LABELS (for field labels) ====================
    labels: {
      name: "Name",
      ssn: "SSN",
      wages: "Wages",
      income: "Income",
      dependents: "Dependents",
      federalWithheld: "Federal Withheld",
      stateWithheld: "State Withheld"
    },

    // ==================== COMMON ====================
    common: {
      appName: "TaxSky",
      tagline: "AI-Powered Tax Filing",
      taxYear: "Tax Year",
      loading: "Loading...",
      save: "Save",
      cancel: "Cancel",
      close: "Close",
      back: "Back",
      next: "Next",
      continue: "Continue",
      submit: "Submit",
      confirm: "Confirm",
      edit: "Edit",
      delete: "Delete",
      download: "Download",
      upload: "Upload",
      print: "Print",
      refresh: "Refresh",
      search: "Search",
      yes: "Yes",
      no: "No",
      ok: "OK",
      done: "Done",
      or: "or",
      and: "and",
      none: "None",
      notProvided: "Not provided",
      notSelected: "Not selected",
      required: "Required",
      optional: "Optional",
      success: "Success",
      error: "Error",
      warning: "Warning",
      info: "Info"
    },

    // ==================== NAVIGATION ====================
    nav: {
      home: "Home",
      dashboard: "Dashboard",
      chat: "Chat with AI",
      fileReturn: "File Return",
      documents: "Documents",
      payments: "Payments",
      refundStatus: "Refund Status",
      profile: "Profile",
      settings: "Settings",
      help: "Help",
      logout: "Log Out",
      login: "Log In",
      signup: "Sign Up"
    },

    // ==================== AUTH ====================
    auth: {
      login: "Log In",
      signup: "Sign Up",
      logout: "Log Out",
      email: "Email",
      password: "Password",
      confirmPassword: "Confirm Password",
      forgotPassword: "Forgot Password?",
      resetPassword: "Reset Password",
      rememberMe: "Remember me",
      noAccount: "Don't have an account?",
      hasAccount: "Already have an account?",
      loginSuccess: "Successfully logged in!",
      logoutSuccess: "Successfully logged out!",
      signupSuccess: "Account created successfully!",
      invalidCredentials: "Invalid email or password",
      passwordMismatch: "Passwords do not match",
      emailRequired: "Email is required",
      passwordRequired: "Password is required"
    },

    // ==================== AI CHAT (Backend) ====================
    aiChat: {
      // Greetings
      welcomeNew: "👋 Hi! I'm TaxSky AI, your personal tax assistant. What's your name?",
      welcomeBack: "👋 Welcome back, {name}!",
      niceMeet: "Nice to meet you, {name}! Ready to file your {year} taxes?",
      
      // Document requests
      uploadPrompt: "📤 Upload your W-2 or 1099 and I'll extract everything automatically!",
      uploadW2: "Please upload your W-2 or 1099.",
      
      // Tax Summary
      taxSummaryTitle: "📊 **{year} Tax Summary**",
      federal: "**Federal:**",
      state: "**State ({state}):**",
      total: "**TOTAL:**",
      
      // Tax labels
      taxableIncome: "Taxable Income",
      tax: "Tax",
      withheld: "Withheld",
      childTaxCredit: "👶 Child Tax Credit",
      refund: "Refund",
      owed: "Owed",
      
      // Results
      refundEmoji: "✅",
      owedEmoji: "❌",
      
      // Questions
      askFilingStatus: "What is your filing status?",
      askDependents: "Do you have any dependents?",
      askDependentCount: "How many dependents do you have?",
      askSpouseInfo: "Please provide your spouse's information.",
      
      // Filing Status Options
      filingStatusOptions: {
        single: "Single",
        mfj: "Married Filing Jointly",
        mfs: "Married Filing Separately",
        hoh: "Head of Household"
      },
      
      // Generate 1040
      generatePrompt: "Would you like me to generate your Form 1040?",
      
      // Upload success
      uploadSuccess: "✅ {formType} uploaded successfully!",
      confirmInfo: "Is this information correct?"
    },

    // ==================== BACKEND MESSAGES (for smartAiController) ====================
    backend: {
      // Welcome messages
      welcomeNew: "👋 Welcome to TaxSky! I'll help you file your {year} taxes.\n\n📤 **Let's start by uploading your tax documents** (W-2, 1099, etc.)\n\nOr just ask me any tax question!",
      welcomeReturning: "👋 Welcome back! I see you have:\n• Wages: {wages}\n• Withheld: {withheld}\n• Filing Status: {status}\n\nWould you like to continue where you left off?",
      
      // Tax questions
      basedOnTaxRules: "📚 Based on {year} tax rules:\n\n{answer}",
      
      // Filing Status
      filingStatusQuestion: "What is your filing status?\n• Single\n• Married Filing Jointly (MFJ)\n• Married Filing Separately (MFS)\n• Head of Household (HOH)",
      filingStatusConfirmed: "✅ Filing Status: **{status}** confirmed!\n\nDo you have any dependents?",
      
      // Dependents
      dependentsQuestion: "Do you have any dependents (children or other qualifying relatives)?",
      howManyDependents: "How many dependents do you have?",
      noDependents: "✅ No dependents noted.\n\n",
      dependentsConfirmed: "✅ {count} dependent(s) recorded.\n\n",
      
      // Income
      incomeCorrectQuestion: "Does this look correct? (Yes/No)",
      incomeCorrection: "What needs to be corrected? You can:\n• Upload additional documents\n• Tell me the correct amounts\n• Change your filing status",
      
      // Adjustments
      adjustmentsQuestion: "📋 **Adjustments to Income**\n\nDo you have any of these?\n• IRA Contributions (up to $7,000 or $8,000 if 50+)\n• Student Loan Interest (up to $2,500)\n• HSA Contributions\n\nType the amount (e.g., 'IRA $5000') or say 'None' to skip.",
      adjustmentSaved: "✅ {type}: {amount} saved!\n\nAny other adjustments? (or type 'Done')",
      
      // Deductions
      deductionsQuestion: "📋 **Deductions**\n\nThe 2025 Standard Deduction for {status} is **{stdDed}**.\n\nWould you like to:\n• Take the **Standard Deduction**\n• **Itemize** your deductions",
      
      // Review & Calculate
      readyToCalculate: "✅ Great! Ready to calculate your taxes?\n\nSay **'Yes'** to see your refund estimate!",
      
      // Results
      taxResultTitle: "🎉 **Your Tax Results**\n\n",
      totalRefund: "💰 **TOTAL REFUND: {amount}**",
      totalOwed: "⚠️ **TOTAL OWED: {amount}**",
      whatNext: "What would you like to do next?\n• 📊 View Dashboard\n• 📄 Download Forms\n• ❓ Ask Questions",
      
      // Errors
      calculationError: "❌ Error calculating taxes. Please try again or contact support."
    },

    // ==================== SMART CHAT INTERFACE (Frontend) ====================
    chat: {
      title: "TaxSky AI",
      placeholder: "Ask me anything about your taxes...",
      send: "Send",
      uploading: "Uploading",
      showData: "Show Data",
      hideData: "Hide Data",
      startOver: "Start Over",
      downloadForm: "Download 1040",
      yourTaxData: "Your Tax Data",
      welcome: "👋 Hello! I'm TaxSky AI. How can I help you with your taxes today?",
      thinking: "Thinking...",
      typing: "TaxSky is typing...",
      quickActions: {
        uploadW2: "Upload W-2",
        filingStatus: "Filing Status",
        addDependent: "Add Dependent",
        checkRefund: "Check Refund",
        fileReturn: "File Return",
        askQuestion: "Ask Question"
      }
    },

    // ==================== DASHBOARD ====================
    dashboard: {
      title: "Tax Dashboard",
      welcome: "Welcome back",
      taxYear: "Tax Year {year}",
      overview: "Overview",
      quickActions: "Quick Actions",
      recentActivity: "Recent Activity",
      totalIncome: "Total Income",
      totalDeductions: "Deductions",
      estimatedRefund: "Estimated Refund",
      amountOwed: "Amount Owed",
      taxesPaid: "Taxes Paid",
      status: "Status",
      notStarted: "Not Started",
      inProgress: "In Progress",
      readyToFile: "Ready to File",
      filed: "Filed",
      accepted: "Accepted",
      rejected: "Rejected",
      startReturn: "Start Return",
      continueReturn: "Continue Return",
      viewReturn: "View Return",
      amendReturn: "Amend Return",
      documents: "Documents",
      uploadedDocs: "Uploaded Documents",
      w2Forms: "W-2 Forms",
      form1099: "1099 Forms",
      otherDocs: "Other Documents",
      noDocuments: "No documents uploaded yet"
    },

    // ==================== FILE TAX RETURN ====================
    fileReturn: {
      title: "File Your Tax Return",
      steps: {
        step1: "Review Info",
        step2: "Verify Income",
        step3: "Check Refund",
        step4: "Confirm & Sign",
        step5: "Complete"
      },
      reviewInfo: {
        title: "Review Your Information",
        personalInfo: "Personal Information",
        name: "Name",
        ssn: "SSN",
        address: "Address",
        filingStatus: "Filing Status",
        dependents: "Dependents",
        editInfo: "Edit Information",
        addDependent: "Add Dependent",
        spouse: "Spouse Information"
      },
      verifyIncome: {
        title: "Verify Your Income",
        w2Income: "W-2 Income",
        form1099Income: "1099 Income",
        otherIncome: "Other Income",
        employer: "Employer",
        wages: "Wages",
        federalWithheld: "Federal Tax Withheld",
        stateWithheld: "State Tax Withheld",
        totalIncome: "Total Income",
        noW2: "No W-2 uploaded yet",
        no1099: "No 1099 uploaded yet",
        uploadW2: "Upload W-2",
        upload1099: "Upload 1099",
        addIncome: "Add Income"
      },
      checkRefund: {
        title: "Your Tax Summary",
        federal: "Federal",
        state: "State",
        taxableIncome: "Taxable Income",
        adjustedGrossIncome: "Adjusted Gross Income",
        standardDeduction: "Standard Deduction",
        itemizedDeductions: "Itemized Deductions",
        totalTax: "Total Tax",
        withheld: "Tax Withheld",
        refund: "Refund",
        owed: "Amount Owed",
        totalRefund: "Total Refund",
        totalOwed: "Total Amount Owed",
        credits: "Tax Credits Applied",
        childTaxCredit: "Child Tax Credit",
        eitc: "Earned Income Tax Credit",
        otherCredits: "Other Credits",
        effectiveRate: "Effective Tax Rate",
        marginalRate: "Marginal Tax Rate"
      },
      confirmSign: {
        title: "Confirm & Sign",
        reviewReturn: "Review Your Return",
        electronicSignature: "Electronic Signature",
        signatureDisclaimer: "By entering your PIN below, you are signing your tax return electronically.",
        enterPin: "Enter 5-digit PIN",
        createPin: "Create PIN",
        confirmPin: "Confirm PIN",
        spouseSignature: "Spouse Signature",
        spousePin: "Spouse PIN (if filing jointly)",
        agreeTerms: "I agree to the terms and conditions",
        agreePerjury: "I declare under penalties of perjury that this return is true and complete",
        irsDisclosure: "Under penalties of perjury, I declare that I have examined this return and to the best of my knowledge and belief, it is true, correct, and complete."
      },
      complete: {
        title: "Filing Complete!",
        success: "Your tax return has been submitted successfully.",
        congratulations: "Congratulations!",
        confirmationNumber: "Confirmation Number",
        submittedOn: "Submitted On",
        expectedRefund: "Expected Refund",
        estimatedDate: "Estimated Refund Date",
        directDeposit: "Direct Deposit",
        paperCheck: "Paper Check",
        downloadReturn: "Download Your Return",
        printCopy: "Print a Copy",
        nextSteps: "Next Steps",
        trackRefund: "Track Your Refund",
        visitIRS: "Visit IRS.gov"
      }
    },

    // ==================== PAYMENT ====================
    payment: {
      title: "Payment",
      pricing: "Pricing",
      checkout: "Checkout",
      history: "Payment History",
      selectPlan: "Select Plan",
      selectThisPlan: "Select This Plan",
      recommendedFor: "Recommended for you",
      mostPopular: "MOST POPULAR",
      bestFor: "Best for",
      youArePurchasing: "You're purchasing",
      taxYear: "Tax Year",
      subtotal: "Subtotal",
      tax: "Tax",
      total: "Total",
      cardInfo: "Card Information",
      pay: "Pay",
      processing: "Processing...",
      securePayment: "Secure payment via Stripe",
      moneyBack: "30-day money-back guarantee",
      paymentSuccessful: "Payment Successful!",
      thankYou: "Thank you for your purchase",
      startFiling: "Start Filing Your Taxes",
      noPayments: "No Payments Yet",
      totalSpent: "Total Spent",
      transactions: "Transactions",
      viewReceipt: "View Receipt",
      status: {
        completed: "Paid",
        pending: "Pending",
        failed: "Failed",
        refunded: "Refunded"
      }
    },

    // ==================== REFUND STATUS ====================
    refundStatus: {
      title: "Refund Status",
      checkStatus: "Check Your Refund Status",
      track: "Track My Refund",
      steps: {
        received: "Return Received",
        approved: "Refund Approved",
        sent: "Refund Sent"
      },
      status: {
        processing: "Being Processed",
        approved: "Refund Approved",
        sent: "Refund Sent"
      },
      estimatedDate: "Estimated Date",
      amount: "Refund Amount",
      method: "Payment Method",
      lastUpdated: "Last Updated"
    },

    // ==================== DOCUMENTS ====================
    documents: {
      title: "Documents",
      myDocuments: "My Documents",
      uploadDocument: "Upload Document",
      types: {
        w2: "Form W-2",
        form1099: "Form 1099",
        taxReturn: "Tax Return",
        receipt: "Receipt",
        other: "Other"
      },
      status: {
        uploaded: "Uploaded",
        processing: "Processing",
        verified: "Verified",
        error: "Error"
      },
      actions: {
        view: "View",
        download: "Download",
        delete: "Delete",
        rename: "Rename"
      },
      messages: {
        uploadSuccess: "Document uploaded successfully",
        uploadFailed: "Failed to upload document",
        deleteConfirm: "Are you sure you want to delete this document?",
        deleteSuccess: "Document deleted",
        noDocuments: "No documents uploaded yet",
        dragDrop: "Drag and drop files here",
        browseFiles: "Browse Files",
        maxSize: "Maximum size: 10MB",
        supportedFormats: "Supported formats: PDF, JPG, PNG"
      }
    },

    // ==================== PROFILE ====================
    profile: {
      title: "Profile",
      myProfile: "My Profile",
      editProfile: "Edit Profile",
      personalInfo: "Personal Information",
      firstName: "First Name",
      middleName: "Middle Name",
      lastName: "Last Name",
      dateOfBirth: "Date of Birth",
      ssn: "Social Security Number",
      phone: "Phone",
      email: "Email",
      address: "Address",
      street: "Street",
      apartment: "Apt/Suite/Unit",
      city: "City",
      state: "State",
      zipCode: "ZIP Code",
      country: "Country",
      spouse: "Spouse Information",
      dependents: "Dependents",
      addDependent: "Add Dependent",
      bankInfo: "Bank Information",
      preferences: "Preferences",
      language: "Language",
      notifications: "Notifications",
      security: "Security",
      changePassword: "Change Password",
      messages: {
        saved: "Profile saved successfully",
        updated: "Profile updated",
        error: "Error saving profile"
      }
    },

    // ==================== ERRORS ====================
    errors: {
      generic: "Sorry, an error occurred. Please try again.",
      networkError: "Network error. Please check your connection.",
      serverError: "Server error. Please try again later.",
      notFound: "Page not found",
      unauthorized: "Please log in to continue",
      forbidden: "You don't have permission to access this",
      sessionExpired: "Your session has expired. Please log in again.",
      invalidInput: "Please check your input and try again",
      required: "This field is required",
      invalidEmail: "Please enter a valid email",
      invalidSSN: "Please enter a valid 9-digit SSN"
    },

    // ==================== SUCCESS ====================
    success: {
      saved: "Saved successfully",
      updated: "Updated successfully",
      deleted: "Deleted successfully",
      uploaded: "Uploaded successfully",
      submitted: "Submitted successfully"
    },

    // ==================== FOOTER ====================
    footer: {
      copyright: "© {year} TaxSky. All rights reserved.",
      privacy: "Privacy Policy",
      terms: "Terms of Service",
      contact: "Contact Us",
      support: "Support",
      about: "About",
      faq: "FAQ"
    }
  },

  // ============================================================
  // VIETNAMESE
  // ============================================================
  vi: {
    // ==================== SYSTEM PROMPTS (for AI) ====================
    system: {
      languageInstruction: "BẠN PHẢI TRẢ LỜI BẰNG TIẾNG VIỆT! Không được dùng tiếng Anh. Mọi tin nhắn phải bằng tiếng Việt 100%.",
      extractionReminder: "LUÔN trích xuất dữ liệu từ tin nhắn người dùng vào trường 'extracted'"
    },

    // ==================== TOP-LEVEL MESSAGES ====================
    welcome: "👋 Xin chào! Tôi là TaxSky AI, trợ lý thuế cá nhân của bạn. Bạn tên gì?",
    welcomeBack: "👋 Chào mừng trở lại",
    niceMeet: "Rất vui được gặp bạn, {name}! Sẵn sàng khai thuế {year} chưa?",
    uploadPrompt: "📤 Tải lên W-2 hoặc 1099 và tôi sẽ tự động trích xuất mọi thứ!",
    uploadSuccess: "✅ {formType} đã tải lên thành công!",
    confirmInfo: "Thông tin này có đúng không?",
    
    // Filing status options
    single: "Độc thân",
    mfj: "Vợ chồng khai chung",
    mfs: "Vợ chồng khai riêng",
    hoh: "Chủ hộ",
    
    // Interview questions
    askFilingStatus: "Tình trạng khai thuế của bạn là gì?",
    askDependents: "Bạn có người phụ thuộc không?",
    askDependentCount: "Bạn có bao nhiêu người phụ thuộc?",
    askSpouseInfo: "Vui lòng cung cấp thông tin vợ/chồng.",

    // ==================== SUMMARY ====================
    summary: {
      title: "📊 **Tóm Tắt Thuế {year}**",
      federal: "**Liên Bang:**",
      state: "**Tiểu Bang",
      total: "TỔNG CỘNG",
      taxable: "Thu nhập chịu thuế",
      tax: "Thuế",
      withheld: "Đã khấu trừ",
      ctc: "👶 Tín dụng thuế trẻ em",
      refund: "Hoàn thuế",
      owed: "Nợ thuế",
      generate: "Bạn có muốn tôi tạo Form 1040 không?"
    },

    // ==================== LABELS ====================
    labels: {
      name: "Họ tên",
      ssn: "Số An Sinh",
      wages: "Lương",
      income: "Thu nhập",
      dependents: "Người phụ thuộc",
      federalWithheld: "Thuế LB đã khấu trừ",
      stateWithheld: "Thuế TB đã khấu trừ"
    },

    common: {
      appName: "TaxSky",
      tagline: "Khai Thuế Bằng AI",
      taxYear: "Năm Thuế",
      loading: "Đang tải...",
      save: "Lưu",
      cancel: "Hủy",
      close: "Đóng",
      back: "Quay lại",
      next: "Tiếp",
      continue: "Tiếp tục",
      submit: "Gửi",
      confirm: "Xác nhận",
      edit: "Sửa",
      delete: "Xóa",
      download: "Tải về",
      upload: "Tải lên",
      print: "In",
      refresh: "Làm mới",
      search: "Tìm kiếm",
      yes: "Có",
      no: "Không",
      ok: "OK",
      done: "Xong",
      or: "hoặc",
      and: "và",
      none: "Không có",
      notProvided: "Chưa cung cấp",
      notSelected: "Chưa chọn",
      required: "Bắt buộc",
      optional: "Tùy chọn",
      success: "Thành công",
      error: "Lỗi",
      warning: "Cảnh báo",
      info: "Thông tin"
    },

    nav: {
      home: "Trang chủ",
      dashboard: "Bảng điều khiển",
      chat: "Chat với AI",
      fileReturn: "Nộp thuế",
      documents: "Tài liệu",
      payments: "Thanh toán",
      refundStatus: "Tình trạng hoàn thuế",
      profile: "Hồ sơ",
      settings: "Cài đặt",
      help: "Trợ giúp",
      logout: "Đăng xuất",
      login: "Đăng nhập",
      signup: "Đăng ký"
    },

    auth: {
      login: "Đăng nhập",
      signup: "Đăng ký",
      logout: "Đăng xuất",
      email: "Email",
      password: "Mật khẩu",
      confirmPassword: "Xác nhận mật khẩu",
      forgotPassword: "Quên mật khẩu?",
      resetPassword: "Đặt lại mật khẩu",
      rememberMe: "Ghi nhớ đăng nhập",
      noAccount: "Chưa có tài khoản?",
      hasAccount: "Đã có tài khoản?",
      loginSuccess: "Đăng nhập thành công!",
      logoutSuccess: "Đăng xuất thành công!",
      signupSuccess: "Tạo tài khoản thành công!",
      invalidCredentials: "Email hoặc mật khẩu không đúng",
      passwordMismatch: "Mật khẩu không khớp",
      emailRequired: "Vui lòng nhập email",
      passwordRequired: "Vui lòng nhập mật khẩu"
    },

    // ==================== AI CHAT (Backend) ====================
    aiChat: {
      welcomeNew: "👋 Xin chào! Tôi là TaxSky AI, trợ lý thuế cá nhân của bạn. Bạn tên gì?",
      welcomeBack: "👋 Chào mừng trở lại, {name}!",
      niceMeet: "Rất vui được gặp bạn, {name}! Sẵn sàng khai thuế {year} chưa?",
      uploadPrompt: "📤 Tải lên W-2 hoặc 1099 và tôi sẽ tự động trích xuất mọi thứ!",
      uploadW2: "Vui lòng tải lên W-2 hoặc 1099 của bạn.",
      taxSummaryTitle: "📊 **Tóm Tắt Thuế {year}**",
      federal: "**Liên Bang:**",
      state: "**Tiểu Bang ({state}):**",
      total: "**TỔNG CỘNG:**",
      taxableIncome: "Thu nhập chịu thuế",
      tax: "Thuế",
      withheld: "Đã khấu trừ",
      childTaxCredit: "👶 Tín dụng thuế trẻ em",
      refund: "Hoàn thuế",
      owed: "Nợ thuế",
      refundEmoji: "✅",
      owedEmoji: "❌",
      askFilingStatus: "Tình trạng khai thuế của bạn là gì?",
      askDependents: "Bạn có người phụ thuộc không?",
      askDependentCount: "Bạn có bao nhiêu người phụ thuộc?",
      askSpouseInfo: "Vui lòng cung cấp thông tin vợ/chồng.",
      filingStatusOptions: {
        single: "Độc thân",
        mfj: "Vợ chồng khai chung",
        mfs: "Vợ chồng khai riêng",
        hoh: "Chủ hộ"
      },
      generatePrompt: "Bạn có muốn tôi tạo Form 1040 không?",
      uploadSuccess: "✅ {formType} đã tải lên thành công!",
      confirmInfo: "Thông tin này có đúng không?"
    },

    // ==================== BACKEND MESSAGES (for smartAiController) ====================
    backend: {
      // Welcome messages
      welcomeNew: "👋 Chào mừng đến TaxSky! Tôi sẽ giúp bạn khai thuế {year}.\n\n📤 **Hãy bắt đầu bằng cách tải lên tài liệu thuế** (W-2, 1099, v.v.)\n\nHoặc chỉ cần hỏi tôi bất kỳ câu hỏi thuế nào!",
      welcomeReturning: "👋 Chào mừng trở lại! Tôi thấy bạn có:\n• Lương: {wages}\n• Đã khấu trừ: {withheld}\n• Tình trạng: {status}\n\nBạn có muốn tiếp tục không?",
      
      // Tax questions
      basedOnTaxRules: "📚 Theo quy định thuế {year}:\n\n{answer}",
      
      // Filing Status
      filingStatusQuestion: "Tình trạng khai thuế của bạn là gì?\n• Độc thân (Single)\n• Vợ chồng khai chung (MFJ)\n• Vợ chồng khai riêng (MFS)\n• Chủ hộ (HOH)",
      filingStatusConfirmed: "✅ Tình trạng khai thuế: **{status}** đã xác nhận!\n\nBạn có người phụ thuộc không?",
      
      // Dependents
      dependentsQuestion: "Bạn có người phụ thuộc (con cái hoặc người thân đủ điều kiện) không?",
      howManyDependents: "Bạn có bao nhiêu người phụ thuộc?",
      noDependents: "✅ Không có người phụ thuộc.\n\n",
      dependentsConfirmed: "✅ Đã ghi nhận {count} người phụ thuộc.\n\n",
      
      // Income
      incomeCorrectQuestion: "Thông tin này có đúng không? (Có/Không)",
      incomeCorrection: "Cần sửa gì? Bạn có thể:\n• Tải thêm tài liệu\n• Cho tôi biết số tiền đúng\n• Thay đổi tình trạng khai thuế",
      
      // Adjustments
      adjustmentsQuestion: "📋 **Điều chỉnh Thu nhập**\n\nBạn có những khoản này không?\n• Đóng góp IRA (tối đa $7,000 hoặc $8,000 nếu trên 50 tuổi)\n• Lãi vay sinh viên (tối đa $2,500)\n• Đóng góp HSA\n\nNhập số tiền (ví dụ: 'IRA $5000') hoặc nói 'Không có' để bỏ qua.",
      adjustmentSaved: "✅ {type}: {amount} đã lưu!\n\nCòn điều chỉnh nào khác không? (hoặc gõ 'Xong')",
      
      // Deductions
      deductionsQuestion: "📋 **Khấu trừ**\n\nKhấu trừ tiêu chuẩn 2025 cho {status} là **{stdDed}**.\n\nBạn muốn:\n• Lấy **Khấu trừ tiêu chuẩn**\n• **Liệt kê chi tiết** các khoản khấu trừ",
      
      // Review & Calculate
      readyToCalculate: "✅ Tuyệt! Sẵn sàng tính thuế?\n\nNói **'Có'** để xem ước tính hoàn thuế!",
      
      // Results
      taxResultTitle: "🎉 **Kết Quả Thuế Của Bạn**\n\n",
      totalRefund: "💰 **TỔNG HOÀN THUẾ: {amount}**",
      totalOwed: "⚠️ **TỔNG NỢ THUẾ: {amount}**",
      whatNext: "Bạn muốn làm gì tiếp?\n• 📊 Xem Bảng điều khiển\n• 📄 Tải Forms\n• ❓ Hỏi thêm",
      
      // Errors
      calculationError: "❌ Lỗi khi tính thuế. Vui lòng thử lại hoặc liên hệ hỗ trợ."
    },

    chat: {
      title: "TaxSky AI",
      placeholder: "Hỏi tôi bất cứ điều gì về thuế...",
      send: "Gửi",
      uploading: "Đang tải",
      showData: "Hiện dữ liệu",
      hideData: "Ẩn dữ liệu",
      startOver: "Bắt đầu lại",
      downloadForm: "Tải Form 1040",
      yourTaxData: "Dữ liệu thuế của bạn",
      welcome: "👋 Xin chào! Tôi là TaxSky AI. Tôi có thể giúp gì cho bạn về thuế?",
      thinking: "Đang suy nghĩ...",
      typing: "TaxSky đang nhập...",
      quickActions: {
        uploadW2: "Tải W-2",
        filingStatus: "Tình trạng khai thuế",
        addDependent: "Thêm người phụ thuộc",
        checkRefund: "Kiểm tra hoàn thuế",
        fileReturn: "Nộp thuế",
        askQuestion: "Đặt câu hỏi"
      }
    },

    dashboard: {
      title: "Bảng Điều Khiển Thuế",
      welcome: "Chào mừng trở lại",
      taxYear: "Năm Thuế {year}",
      overview: "Tổng quan",
      quickActions: "Thao tác nhanh",
      recentActivity: "Hoạt động gần đây",
      totalIncome: "Tổng thu nhập",
      totalDeductions: "Khấu trừ",
      estimatedRefund: "Hoàn thuế ước tính",
      amountOwed: "Số tiền nợ",
      taxesPaid: "Thuế đã đóng",
      status: "Trạng thái",
      notStarted: "Chưa bắt đầu",
      inProgress: "Đang tiến hành",
      readyToFile: "Sẵn sàng nộp",
      filed: "Đã nộp",
      accepted: "Đã chấp nhận",
      rejected: "Bị từ chối",
      startReturn: "Bắt đầu khai thuế",
      continueReturn: "Tiếp tục khai thuế",
      viewReturn: "Xem tờ khai",
      amendReturn: "Sửa tờ khai",
      documents: "Tài liệu",
      uploadedDocs: "Tài liệu đã tải",
      w2Forms: "Form W-2",
      form1099: "Form 1099",
      otherDocs: "Tài liệu khác",
      noDocuments: "Chưa có tài liệu nào"
    },

    fileReturn: {
      title: "Nộp Tờ Khai Thuế",
      steps: {
        step1: "Xem thông tin",
        step2: "Xác nhận thu nhập",
        step3: "Kiểm tra hoàn thuế",
        step4: "Xác nhận & Ký",
        step5: "Hoàn tất"
      },
      reviewInfo: {
        title: "Xem Lại Thông Tin",
        personalInfo: "Thông Tin Cá Nhân",
        name: "Họ tên",
        ssn: "Số An Sinh",
        address: "Địa chỉ",
        filingStatus: "Tình trạng khai thuế",
        dependents: "Người phụ thuộc",
        editInfo: "Sửa thông tin",
        addDependent: "Thêm người phụ thuộc",
        spouse: "Thông tin vợ/chồng"
      },
      verifyIncome: {
        title: "Xác Nhận Thu Nhập",
        w2Income: "Thu nhập W-2",
        form1099Income: "Thu nhập 1099",
        otherIncome: "Thu nhập khác",
        employer: "Nhà tuyển dụng",
        wages: "Lương",
        federalWithheld: "Thuế LB đã khấu trừ",
        stateWithheld: "Thuế TB đã khấu trừ",
        totalIncome: "Tổng thu nhập",
        noW2: "Chưa tải W-2",
        no1099: "Chưa tải 1099",
        uploadW2: "Tải W-2",
        upload1099: "Tải 1099",
        addIncome: "Thêm thu nhập"
      },
      checkRefund: {
        title: "Tóm Tắt Thuế",
        federal: "Liên Bang",
        state: "Tiểu Bang",
        taxableIncome: "Thu nhập chịu thuế",
        adjustedGrossIncome: "Thu nhập gộp điều chỉnh",
        standardDeduction: "Khấu trừ tiêu chuẩn",
        itemizedDeductions: "Khấu trừ chi tiết",
        totalTax: "Tổng thuế",
        withheld: "Thuế đã khấu trừ",
        refund: "Hoàn thuế",
        owed: "Nợ thuế",
        totalRefund: "Tổng hoàn thuế",
        totalOwed: "Tổng nợ thuế",
        credits: "Tín dụng thuế",
        childTaxCredit: "Tín dụng trẻ em",
        eitc: "EITC",
        otherCredits: "Tín dụng khác",
        effectiveRate: "Thuế suất thực tế",
        marginalRate: "Thuế suất biên"
      },
      confirmSign: {
        title: "Xác Nhận & Ký",
        reviewReturn: "Xem lại tờ khai",
        electronicSignature: "Chữ ký điện tử",
        signatureDisclaimer: "Bằng cách nhập PIN, bạn đang ký điện tử tờ khai thuế.",
        enterPin: "Nhập PIN 5 số",
        createPin: "Tạo PIN",
        confirmPin: "Xác nhận PIN",
        spouseSignature: "Chữ ký vợ/chồng",
        spousePin: "PIN vợ/chồng",
        agreeTerms: "Tôi đồng ý với điều khoản",
        agreePerjury: "Tôi khai báo thật theo luật"
      },
      complete: {
        title: "Nộp Thuế Hoàn Tất!",
        success: "Tờ khai thuế đã được nộp thành công.",
        congratulations: "Chúc mừng!",
        confirmationNumber: "Số xác nhận",
        submittedOn: "Ngày nộp",
        expectedRefund: "Hoàn thuế dự kiến",
        estimatedDate: "Ngày dự kiến",
        directDeposit: "Chuyển khoản",
        paperCheck: "Séc giấy",
        downloadReturn: "Tải tờ khai",
        printCopy: "In bản sao",
        nextSteps: "Bước tiếp theo",
        trackRefund: "Theo dõi hoàn thuế",
        visitIRS: "Truy cập IRS.gov"
      }
    },

    payment: {
      title: "Thanh Toán",
      pricing: "Bảng Giá",
      checkout: "Thanh Toán",
      history: "Lịch Sử Thanh Toán",
      selectPlan: "Chọn Gói",
      selectThisPlan: "Chọn Gói Này",
      recommendedFor: "Đề xuất cho bạn",
      mostPopular: "PHỔ BIẾN NHẤT",
      bestFor: "Phù hợp cho",
      youArePurchasing: "Bạn đang mua",
      taxYear: "Năm thuế",
      subtotal: "Tạm tính",
      tax: "Thuế",
      total: "Tổng cộng",
      cardInfo: "Thông tin thẻ",
      pay: "Thanh toán",
      processing: "Đang xử lý...",
      securePayment: "Thanh toán an toàn qua Stripe",
      moneyBack: "Hoàn tiền trong 30 ngày",
      paymentSuccessful: "Thanh Toán Thành Công!",
      thankYou: "Cảm ơn bạn đã mua",
      startFiling: "Bắt Đầu Khai Thuế",
      noPayments: "Chưa Có Thanh Toán",
      totalSpent: "Tổng chi tiêu",
      transactions: "Giao dịch",
      viewReceipt: "Xem biên lai",
      status: {
        completed: "Đã thanh toán",
        pending: "Đang chờ",
        failed: "Thất bại",
        refunded: "Đã hoàn tiền"
      }
    },

    refundStatus: {
      title: "Tình Trạng Hoàn Thuế",
      checkStatus: "Kiểm Tra Tình Trạng Hoàn Thuế",
      track: "Theo Dõi Hoàn Thuế",
      steps: {
        received: "Đã nhận tờ khai",
        approved: "Đã duyệt hoàn thuế",
        sent: "Đã gửi hoàn thuế"
      },
      status: {
        processing: "Đang xử lý",
        approved: "Đã duyệt",
        sent: "Đã gửi"
      },
      estimatedDate: "Ngày dự kiến",
      amount: "Số tiền hoàn",
      method: "Phương thức",
      lastUpdated: "Cập nhật lần cuối"
    },

    documents: {
      title: "Tài Liệu",
      myDocuments: "Tài liệu của tôi",
      uploadDocument: "Tải tài liệu",
      types: {
        w2: "Form W-2",
        form1099: "Form 1099",
        taxReturn: "Tờ khai thuế",
        receipt: "Biên lai",
        other: "Khác"
      },
      status: {
        uploaded: "Đã tải",
        processing: "Đang xử lý",
        verified: "Đã xác minh",
        error: "Lỗi"
      },
      actions: {
        view: "Xem",
        download: "Tải về",
        delete: "Xóa",
        rename: "Đổi tên"
      },
      messages: {
        uploadSuccess: "Tải tài liệu thành công",
        uploadFailed: "Tải tài liệu thất bại",
        deleteConfirm: "Bạn có chắc muốn xóa tài liệu này?",
        deleteSuccess: "Đã xóa tài liệu",
        noDocuments: "Chưa có tài liệu",
        dragDrop: "Kéo thả tệp vào đây",
        browseFiles: "Chọn tệp",
        maxSize: "Kích thước tối đa: 10MB",
        supportedFormats: "Định dạng hỗ trợ: PDF, JPG, PNG"
      }
    },

    profile: {
      title: "Hồ Sơ",
      myProfile: "Hồ sơ của tôi",
      editProfile: "Sửa hồ sơ",
      personalInfo: "Thông tin cá nhân",
      firstName: "Tên",
      middleName: "Tên đệm",
      lastName: "Họ",
      dateOfBirth: "Ngày sinh",
      ssn: "Số An Sinh Xã Hội",
      phone: "Điện thoại",
      email: "Email",
      address: "Địa chỉ",
      street: "Đường",
      apartment: "Căn hộ",
      city: "Thành phố",
      state: "Tiểu bang",
      zipCode: "Mã bưu điện",
      country: "Quốc gia",
      spouse: "Thông tin vợ/chồng",
      dependents: "Người phụ thuộc",
      addDependent: "Thêm người phụ thuộc",
      bankInfo: "Thông tin ngân hàng",
      preferences: "Tùy chọn",
      language: "Ngôn ngữ",
      notifications: "Thông báo",
      security: "Bảo mật",
      changePassword: "Đổi mật khẩu",
      messages: {
        saved: "Đã lưu hồ sơ",
        updated: "Đã cập nhật hồ sơ",
        error: "Lỗi khi lưu hồ sơ"
      }
    },

    errors: {
      generic: "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.",
      networkError: "Lỗi mạng. Vui lòng kiểm tra kết nối.",
      serverError: "Lỗi máy chủ. Vui lòng thử lại sau.",
      notFound: "Không tìm thấy trang",
      unauthorized: "Vui lòng đăng nhập để tiếp tục",
      forbidden: "Bạn không có quyền truy cập",
      sessionExpired: "Phiên đã hết hạn. Vui lòng đăng nhập lại.",
      invalidInput: "Vui lòng kiểm tra thông tin và thử lại",
      required: "Trường này bắt buộc",
      invalidEmail: "Vui lòng nhập email hợp lệ",
      invalidSSN: "Vui lòng nhập SSN 9 số hợp lệ"
    },

    success: {
      saved: "Đã lưu thành công",
      updated: "Đã cập nhật thành công",
      deleted: "Đã xóa thành công",
      uploaded: "Đã tải lên thành công",
      submitted: "Đã gửi thành công"
    },

    footer: {
      copyright: "© {year} TaxSky. Bảo lưu mọi quyền.",
      privacy: "Chính sách bảo mật",
      terms: "Điều khoản dịch vụ",
      contact: "Liên hệ",
      support: "Hỗ trợ",
      about: "Giới thiệu",
      faq: "Câu hỏi thường gặp"
    }
  },

  // ============================================================
  // SPANISH
  // ============================================================
  es: {
    // ==================== SYSTEM PROMPTS (for AI) ====================
    system: {
      languageInstruction: "¡DEBES RESPONDER EN ESPAÑOL! No uses inglés. Todos los mensajes deben estar 100% en español.",
      extractionReminder: "SIEMPRE extrae datos de los mensajes del usuario al campo 'extracted'"
    },

    // ==================== TOP-LEVEL MESSAGES ====================
    welcome: "👋 ¡Hola! Soy TaxSky AI, tu asistente de impuestos personal. ¿Cómo te llamas?",
    welcomeBack: "👋 ¡Bienvenido de nuevo",
    niceMeet: "¡Mucho gusto, {name}! ¿Listo para declarar tus impuestos {year}?",
    uploadPrompt: "📤 ¡Sube tu W-2 o 1099 y extraeré todo automáticamente!",
    uploadSuccess: "✅ ¡{formType} subido exitosamente!",
    confirmInfo: "¿Es correcta esta información?",
    
    // Filing status options
    single: "Soltero",
    mfj: "Casado declarando en conjunto",
    mfs: "Casado declarando por separado",
    hoh: "Jefe de familia",
    
    // Interview questions
    askFilingStatus: "¿Cuál es tu estado civil tributario?",
    askDependents: "¿Tienes dependientes?",
    askDependentCount: "¿Cuántos dependientes tienes?",
    askSpouseInfo: "Por favor proporciona la información de tu cónyuge.",

    // ==================== SUMMARY ====================
    summary: {
      title: "📊 **Resumen Fiscal {year}**",
      federal: "**Federal:**",
      state: "**Estatal",
      total: "TOTAL",
      taxable: "Ingreso gravable",
      tax: "Impuesto",
      withheld: "Retenido",
      ctc: "👶 Crédito tributario por hijos",
      refund: "Reembolso",
      owed: "Adeudo",
      generate: "¿Quieres que genere tu Form 1040?"
    },

    // ==================== LABELS ====================
    labels: {
      name: "Nombre",
      ssn: "SSN",
      wages: "Salarios",
      income: "Ingresos",
      dependents: "Dependientes",
      federalWithheld: "Retención federal",
      stateWithheld: "Retención estatal"
    },

    common: {
      appName: "TaxSky",
      tagline: "Declaración de Impuestos con IA",
      taxYear: "Año Fiscal",
      loading: "Cargando...",
      save: "Guardar",
      cancel: "Cancelar",
      close: "Cerrar",
      back: "Atrás",
      next: "Siguiente",
      continue: "Continuar",
      submit: "Enviar",
      confirm: "Confirmar",
      edit: "Editar",
      delete: "Eliminar",
      download: "Descargar",
      upload: "Subir",
      print: "Imprimir",
      refresh: "Actualizar",
      search: "Buscar",
      yes: "Sí",
      no: "No",
      ok: "OK",
      done: "Listo",
      or: "o",
      and: "y",
      none: "Ninguno",
      notProvided: "No proporcionado",
      notSelected: "No seleccionado",
      required: "Requerido",
      optional: "Opcional",
      success: "Éxito",
      error: "Error",
      warning: "Advertencia",
      info: "Información"
    },

    nav: {
      home: "Inicio",
      dashboard: "Panel",
      chat: "Chat con IA",
      fileReturn: "Presentar Declaración",
      documents: "Documentos",
      payments: "Pagos",
      refundStatus: "Estado del Reembolso",
      profile: "Perfil",
      settings: "Configuración",
      help: "Ayuda",
      logout: "Cerrar Sesión",
      login: "Iniciar Sesión",
      signup: "Registrarse"
    },

    auth: {
      login: "Iniciar Sesión",
      signup: "Registrarse",
      logout: "Cerrar Sesión",
      email: "Correo electrónico",
      password: "Contraseña",
      confirmPassword: "Confirmar contraseña",
      forgotPassword: "¿Olvidó su contraseña?",
      resetPassword: "Restablecer contraseña",
      rememberMe: "Recordarme",
      noAccount: "¿No tiene cuenta?",
      hasAccount: "¿Ya tiene cuenta?",
      loginSuccess: "¡Sesión iniciada!",
      logoutSuccess: "¡Sesión cerrada!",
      signupSuccess: "¡Cuenta creada!",
      invalidCredentials: "Email o contraseña incorrectos",
      passwordMismatch: "Las contraseñas no coinciden",
      emailRequired: "Se requiere email",
      passwordRequired: "Se requiere contraseña"
    },

    // ==================== AI CHAT (Backend) ====================
    aiChat: {
      welcomeNew: "👋 ¡Hola! Soy TaxSky AI, tu asistente de impuestos personal. ¿Cómo te llamas?",
      welcomeBack: "👋 ¡Bienvenido de nuevo, {name}!",
      niceMeet: "¡Mucho gusto, {name}! ¿Listo para declarar tus impuestos {year}?",
      uploadPrompt: "📤 ¡Sube tu W-2 o 1099 y extraeré todo automáticamente!",
      uploadW2: "Por favor sube tu W-2 o 1099.",
      taxSummaryTitle: "📊 **Resumen Fiscal {year}**",
      federal: "**Federal:**",
      state: "**Estatal ({state}):**",
      total: "**TOTAL:**",
      taxableIncome: "Ingreso gravable",
      tax: "Impuesto",
      withheld: "Retenido",
      childTaxCredit: "👶 Crédito tributario por hijos",
      refund: "Reembolso",
      owed: "Adeudo",
      refundEmoji: "✅",
      owedEmoji: "❌",
      askFilingStatus: "¿Cuál es tu estado civil tributario?",
      askDependents: "¿Tienes dependientes?",
      askDependentCount: "¿Cuántos dependientes tienes?",
      askSpouseInfo: "Por favor proporciona la información de tu cónyuge.",
      filingStatusOptions: {
        single: "Soltero",
        mfj: "Casado declarando en conjunto",
        mfs: "Casado declarando por separado",
        hoh: "Jefe de familia"
      },
      generatePrompt: "¿Quieres que genere tu Form 1040?",
      uploadSuccess: "✅ ¡{formType} subido exitosamente!",
      confirmInfo: "¿Es correcta esta información?"
    },

    // ==================== BACKEND MESSAGES (for smartAiController) ====================
    backend: {
      // Welcome messages
      welcomeNew: "👋 ¡Bienvenido a TaxSky! Te ayudaré a declarar tus impuestos de {year}.\n\n📤 **Comencemos subiendo tus documentos fiscales** (W-2, 1099, etc.)\n\n¡O simplemente hazme cualquier pregunta sobre impuestos!",
      welcomeReturning: "👋 ¡Bienvenido de nuevo! Veo que tienes:\n• Salarios: {wages}\n• Retenido: {withheld}\n• Estado: {status}\n\n¿Quieres continuar donde lo dejaste?",
      
      // Tax questions
      basedOnTaxRules: "📚 Según las reglas fiscales de {year}:\n\n{answer}",
      
      // Filing Status
      filingStatusQuestion: "¿Cuál es tu estado civil?\n• Soltero (Single)\n• Casado declarando juntos (MFJ)\n• Casado declarando separado (MFS)\n• Cabeza de familia (HOH)",
      filingStatusConfirmed: "✅ Estado civil: **{status}** ¡confirmado!\n\n¿Tienes dependientes?",
      
      // Dependents
      dependentsQuestion: "¿Tienes dependientes (hijos u otros familiares calificados)?",
      howManyDependents: "¿Cuántos dependientes tienes?",
      noDependents: "✅ Sin dependientes.\n\n",
      dependentsConfirmed: "✅ {count} dependiente(s) registrado(s).\n\n",
      
      // Income
      incomeCorrectQuestion: "¿Esto es correcto? (Sí/No)",
      incomeCorrection: "¿Qué necesita corregirse? Puedes:\n• Subir documentos adicionales\n• Decirme los montos correctos\n• Cambiar tu estado civil",
      
      // Adjustments
      adjustmentsQuestion: "📋 **Ajustes al Ingreso**\n\n¿Tienes alguno de estos?\n• Contribuciones IRA (hasta $7,000 o $8,000 si tienes 50+)\n• Intereses de préstamo estudiantil (hasta $2,500)\n• Contribuciones HSA\n\nEscribe el monto (ej: 'IRA $5000') o di 'Ninguno' para omitir.",
      adjustmentSaved: "✅ {type}: {amount} ¡guardado!\n\n¿Algún otro ajuste? (o escribe 'Listo')",
      
      // Deductions
      deductionsQuestion: "📋 **Deducciones**\n\nLa Deducción Estándar 2025 para {status} es **{stdDed}**.\n\n¿Quieres:\n• Tomar la **Deducción Estándar**\n• **Detallar** tus deducciones",
      
      // Review & Calculate
      readyToCalculate: "✅ ¡Genial! ¿Listo para calcular tus impuestos?\n\n¡Di **'Sí'** para ver tu estimación de reembolso!",
      
      // Results
      taxResultTitle: "🎉 **Tus Resultados Fiscales**\n\n",
      totalRefund: "💰 **REEMBOLSO TOTAL: {amount}**",
      totalOwed: "⚠️ **TOTAL ADEUDADO: {amount}**",
      whatNext: "¿Qué te gustaría hacer?\n• 📊 Ver Panel\n• 📄 Descargar Formularios\n• ❓ Hacer Preguntas",
      
      // Errors
      calculationError: "❌ Error al calcular impuestos. Por favor intenta de nuevo o contacta soporte."
    },

    chat: {
      title: "TaxSky AI",
      placeholder: "Pregúntame sobre tus impuestos...",
      send: "Enviar",
      uploading: "Subiendo",
      showData: "Mostrar datos",
      hideData: "Ocultar datos",
      startOver: "Empezar de nuevo",
      downloadForm: "Descargar 1040",
      yourTaxData: "Tus datos fiscales",
      welcome: "👋 ¡Hola! Soy TaxSky AI. ¿Cómo puedo ayudarte con tus impuestos?",
      thinking: "Pensando...",
      typing: "TaxSky está escribiendo...",
      quickActions: {
        uploadW2: "Subir W-2",
        filingStatus: "Estado civil",
        addDependent: "Agregar dependiente",
        checkRefund: "Ver reembolso",
        fileReturn: "Declarar",
        askQuestion: "Preguntar"
      }
    },

    dashboard: {
      title: "Panel de Impuestos",
      welcome: "Bienvenido de nuevo",
      taxYear: "Año Fiscal {year}",
      overview: "Resumen",
      quickActions: "Acciones rápidas",
      recentActivity: "Actividad reciente",
      totalIncome: "Ingreso total",
      totalDeductions: "Deducciones",
      estimatedRefund: "Reembolso estimado",
      amountOwed: "Monto adeudado",
      taxesPaid: "Impuestos pagados",
      status: "Estado",
      notStarted: "No iniciado",
      inProgress: "En progreso",
      readyToFile: "Listo para declarar",
      filed: "Declarado",
      accepted: "Aceptado",
      rejected: "Rechazado",
      startReturn: "Iniciar declaración",
      continueReturn: "Continuar declaración",
      viewReturn: "Ver declaración",
      amendReturn: "Enmendar declaración",
      documents: "Documentos",
      uploadedDocs: "Documentos subidos",
      w2Forms: "Formularios W-2",
      form1099: "Formularios 1099",
      otherDocs: "Otros documentos",
      noDocuments: "No hay documentos"
    },

    fileReturn: {
      title: "Presentar Declaración",
      steps: {
        step1: "Revisar info",
        step2: "Verificar ingresos",
        step3: "Ver reembolso",
        step4: "Confirmar y firmar",
        step5: "Completar"
      },
      reviewInfo: {
        title: "Revisar Información",
        personalInfo: "Información Personal",
        name: "Nombre",
        ssn: "SSN",
        address: "Dirección",
        filingStatus: "Estado civil tributario",
        dependents: "Dependientes",
        editInfo: "Editar información",
        addDependent: "Agregar dependiente",
        spouse: "Información del cónyuge"
      },
      verifyIncome: {
        title: "Verificar Ingresos",
        w2Income: "Ingresos W-2",
        form1099Income: "Ingresos 1099",
        otherIncome: "Otros ingresos",
        employer: "Empleador",
        wages: "Salarios",
        federalWithheld: "Retención federal",
        stateWithheld: "Retención estatal",
        totalIncome: "Ingreso total",
        noW2: "Sin W-2",
        no1099: "Sin 1099",
        uploadW2: "Subir W-2",
        upload1099: "Subir 1099",
        addIncome: "Agregar ingreso"
      },
      checkRefund: {
        title: "Resumen Fiscal",
        federal: "Federal",
        state: "Estatal",
        taxableIncome: "Ingreso gravable",
        adjustedGrossIncome: "AGI",
        standardDeduction: "Deducción estándar",
        itemizedDeductions: "Deducciones detalladas",
        totalTax: "Impuesto total",
        withheld: "Retenido",
        refund: "Reembolso",
        owed: "Adeudo",
        totalRefund: "Reembolso total",
        totalOwed: "Adeudo total",
        credits: "Créditos aplicados",
        childTaxCredit: "Crédito por hijos",
        eitc: "EITC",
        otherCredits: "Otros créditos"
      },
      confirmSign: {
        title: "Confirmar y Firmar",
        reviewReturn: "Revisar declaración",
        electronicSignature: "Firma electrónica",
        signatureDisclaimer: "Al ingresar tu PIN, firmas electrónicamente tu declaración.",
        enterPin: "Ingresa PIN de 5 dígitos",
        createPin: "Crear PIN",
        confirmPin: "Confirmar PIN",
        spouseSignature: "Firma del cónyuge",
        spousePin: "PIN del cónyuge",
        agreeTerms: "Acepto los términos",
        agreePerjury: "Declaro bajo pena de perjurio"
      },
      complete: {
        title: "¡Declaración Completa!",
        success: "Tu declaración fue enviada exitosamente.",
        congratulations: "¡Felicitaciones!",
        confirmationNumber: "Número de confirmación",
        submittedOn: "Fecha de envío",
        expectedRefund: "Reembolso esperado",
        estimatedDate: "Fecha estimada",
        directDeposit: "Depósito directo",
        paperCheck: "Cheque",
        downloadReturn: "Descargar declaración",
        printCopy: "Imprimir copia",
        nextSteps: "Próximos pasos",
        trackRefund: "Rastrear reembolso",
        visitIRS: "Visitar IRS.gov"
      }
    },

    payment: {
      title: "Pago",
      pricing: "Precios",
      checkout: "Pagar",
      history: "Historial de Pagos",
      selectPlan: "Seleccionar Plan",
      selectThisPlan: "Seleccionar Este Plan",
      recommendedFor: "Recomendado para ti",
      mostPopular: "MÁS POPULAR",
      bestFor: "Ideal para",
      youArePurchasing: "Estás comprando",
      taxYear: "Año fiscal",
      subtotal: "Subtotal",
      tax: "Impuesto",
      total: "Total",
      cardInfo: "Información de tarjeta",
      pay: "Pagar",
      processing: "Procesando...",
      securePayment: "Pago seguro via Stripe",
      moneyBack: "Garantía de 30 días",
      paymentSuccessful: "¡Pago Exitoso!",
      thankYou: "Gracias por tu compra",
      startFiling: "Comenzar Declaración",
      noPayments: "Sin Pagos",
      totalSpent: "Total gastado",
      transactions: "Transacciones",
      viewReceipt: "Ver recibo",
      status: {
        completed: "Pagado",
        pending: "Pendiente",
        failed: "Fallido",
        refunded: "Reembolsado"
      }
    },

    refundStatus: {
      title: "Estado del Reembolso",
      checkStatus: "Verificar Estado del Reembolso",
      track: "Rastrear Reembolso",
      steps: {
        received: "Declaración recibida",
        approved: "Reembolso aprobado",
        sent: "Reembolso enviado"
      },
      status: {
        processing: "Procesando",
        approved: "Aprobado",
        sent: "Enviado"
      },
      estimatedDate: "Fecha estimada",
      amount: "Monto",
      method: "Método",
      lastUpdated: "Última actualización"
    },

    documents: {
      title: "Documentos",
      myDocuments: "Mis documentos",
      uploadDocument: "Subir documento",
      types: {
        w2: "Formulario W-2",
        form1099: "Formulario 1099",
        taxReturn: "Declaración",
        receipt: "Recibo",
        other: "Otro"
      },
      status: {
        uploaded: "Subido",
        processing: "Procesando",
        verified: "Verificado",
        error: "Error"
      },
      actions: {
        view: "Ver",
        download: "Descargar",
        delete: "Eliminar",
        rename: "Renombrar"
      },
      messages: {
        uploadSuccess: "Documento subido",
        uploadFailed: "Error al subir",
        deleteConfirm: "¿Eliminar documento?",
        deleteSuccess: "Documento eliminado",
        noDocuments: "Sin documentos",
        dragDrop: "Arrastra archivos aquí",
        browseFiles: "Explorar archivos",
        maxSize: "Máximo: 10MB",
        supportedFormats: "Formatos: PDF, JPG, PNG"
      }
    },

    profile: {
      title: "Perfil",
      myProfile: "Mi perfil",
      editProfile: "Editar perfil",
      personalInfo: "Información personal",
      firstName: "Nombre",
      middleName: "Segundo nombre",
      lastName: "Apellido",
      dateOfBirth: "Fecha de nacimiento",
      ssn: "Número de Seguro Social",
      phone: "Teléfono",
      email: "Correo electrónico",
      address: "Dirección",
      street: "Calle",
      apartment: "Apt/Suite",
      city: "Ciudad",
      state: "Estado",
      zipCode: "Código postal",
      country: "País",
      spouse: "Cónyuge",
      dependents: "Dependientes",
      addDependent: "Agregar dependiente",
      bankInfo: "Información bancaria",
      preferences: "Preferencias",
      language: "Idioma",
      notifications: "Notificaciones",
      security: "Seguridad",
      changePassword: "Cambiar contraseña",
      messages: {
        saved: "Perfil guardado",
        updated: "Perfil actualizado",
        error: "Error al guardar"
      }
    },

    errors: {
      generic: "Lo siento, ocurrió un error. Intenta de nuevo.",
      networkError: "Error de red. Verifica tu conexión.",
      serverError: "Error del servidor. Intenta más tarde.",
      notFound: "Página no encontrada",
      unauthorized: "Inicia sesión para continuar",
      forbidden: "Sin permiso de acceso",
      sessionExpired: "Sesión expirada. Inicia sesión de nuevo.",
      invalidInput: "Verifica los datos e intenta de nuevo",
      required: "Campo requerido",
      invalidEmail: "Email inválido",
      invalidSSN: "SSN inválido"
    },

    success: {
      saved: "Guardado",
      updated: "Actualizado",
      deleted: "Eliminado",
      uploaded: "Subido",
      submitted: "Enviado"
    },

    footer: {
      copyright: "© {year} TaxSky. Todos los derechos reservados.",
      privacy: "Privacidad",
      terms: "Términos",
      contact: "Contacto",
      support: "Soporte",
      about: "Acerca de",
      faq: "FAQ"
    }
  }
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get translations for a language
 */
export function t(lang = 'en') {
  return translations[lang] || translations.en;
}

/**
 * Get a specific translation with variable replacement
 * Example: getText('en', 'aiChat.welcomeBack', { name: 'John' })
 */
export function getText(lang, path, vars = {}) {
  const langData = translations[lang] || translations.en;
  const keys = path.split('.');
  
  let value = langData;
  for (const key of keys) {
    value = value?.[key];
    if (value === undefined) {
      // Fallback to English
      value = translations.en;
      for (const k of keys) {
        value = value?.[k];
        if (value === undefined) return path;
      }
      break;
    }
  }
  
  if (typeof value !== 'string') return path;
  
  // Replace variables like {year}, {name}
  for (const [varName, val] of Object.entries(vars)) {
    value = value.replace(new RegExp(`\\{${varName}\\}`, 'g'), val);
  }
  
  return value;
}

/**
 * Alias for getText (backward compatibility)
 */
export function getNestedText(lang, path, vars = {}) {
  return getText(lang, path, vars);
}

/**
 * Get language display name
 */
export function getLanguageName(code) {
  const names = {
    en: 'English',
    vi: 'Tiếng Việt',
    es: 'Español'
  };
  return names[code] || code;
}

/**
 * Format currency based on language
 */
export function formatCurrency(amount, lang = 'en') {
  const num = Number(amount) || 0;
  return '$' + num.toLocaleString(lang === 'vi' ? 'vi-VN' : lang === 'es' ? 'es-US' : 'en-US');
}

/**
 * Format date based on language
 */
export function formatDate(date, lang = 'en') {
  const d = new Date(date);
  const locales = { en: 'en-US', vi: 'vi-VN', es: 'es-US' };
  return d.toLocaleDateString(locales[lang] || 'en-US');
}

/**
 * Format filing status for display
 */
export function formatFilingStatus(status, lang = 'en') {
  const txt = t(lang);
  const statusMap = {
    'single': txt.aiChat?.filingStatusOptions?.single || 'Single',
    'married_filing_jointly': txt.aiChat?.filingStatusOptions?.mfj || 'Married Filing Jointly',
    'married_filing_separately': txt.aiChat?.filingStatusOptions?.mfs || 'Married Filing Separately',
    'head_of_household': txt.aiChat?.filingStatusOptions?.hoh || 'Head of Household'
  };
  return statusMap[status] || status;
}

export default {
  translations,
  SUPPORTED_LANGUAGES,
  t,
  getText,
  getNestedText,
  getLanguageName,
  formatCurrency,
  formatDate,
  formatFilingStatus
};