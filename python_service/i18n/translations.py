# i18n/translations.py
# ============================================================
# INTERNATIONALIZATION - Multi-language Support
# ============================================================
# User selects language from frontend
# Backend returns all messages in selected language
# ============================================================

from typing import Dict, Any

# ============================================================
# SUPPORTED LANGUAGES
# ============================================================
SUPPORTED_LANGUAGES = {
    "en": "English",
    "es": "Español",
    "vi": "Tiếng Việt",
    "zh": "中文",
    "ko": "한국어",
    "tl": "Tagalog"
}

DEFAULT_LANGUAGE = "en"

# ============================================================
# TRANSLATIONS
# ============================================================
TRANSLATIONS = {
    # ==================== FILING STATUS ====================
    "filing_status": {
        "en": "Filing Status",
        "es": "Estado civil tributario",
        "vi": "Tình trạng khai thuế",
        "zh": "报税身份",
        "ko": "신고 상태",
        "tl": "Katayuan ng Pag-file"
    },
    "single": {
        "en": "Single",
        "es": "Soltero/a",
        "vi": "Độc thân",
        "zh": "单身",
        "ko": "미혼",
        "tl": "Walang asawa"
    },
    "married_filing_jointly": {
        "en": "Married Filing Jointly",
        "es": "Casado/a declarando en conjunto",
        "vi": "Kết hôn khai chung",
        "zh": "已婚联合报税",
        "ko": "부부 공동 신고",
        "tl": "Kasal na Magkasamang Nag-file"
    },
    "married_filing_separately": {
        "en": "Married Filing Separately",
        "es": "Casado/a declarando por separado",
        "vi": "Kết hôn khai riêng",
        "zh": "已婚分开报税",
        "ko": "부부 별도 신고",
        "tl": "Kasal na Hiwalay na Nag-file"
    },
    "head_of_household": {
        "en": "Head of Household",
        "es": "Jefe/a de familia",
        "vi": "Chủ hộ",
        "zh": "户主",
        "ko": "세대주",
        "tl": "Pinuno ng Sambahayan"
    },
    
    # ==================== INCOME ====================
    "income": {
        "en": "Income",
        "es": "Ingresos",
        "vi": "Thu nhập",
        "zh": "收入",
        "ko": "소득",
        "tl": "Kita"
    },
    "wages": {
        "en": "Wages (W-2)",
        "es": "Salarios (W-2)",
        "vi": "Tiền lương (W-2)",
        "zh": "工资 (W-2)",
        "ko": "급여 (W-2)",
        "tl": "Sahod (W-2)"
    },
    "self_employment": {
        "en": "Self-Employment Income (1099-NEC)",
        "es": "Ingresos de trabajo por cuenta propia (1099-NEC)",
        "vi": "Thu nhập tự kinh doanh (1099-NEC)",
        "zh": "自雇收入 (1099-NEC)",
        "ko": "자영업 소득 (1099-NEC)",
        "tl": "Kita mula sa Sariling Negosyo (1099-NEC)"
    },
    "interest_income": {
        "en": "Interest Income (1099-INT)",
        "es": "Ingresos por intereses (1099-INT)",
        "vi": "Thu nhập lãi suất (1099-INT)",
        "zh": "利息收入 (1099-INT)",
        "ko": "이자 소득 (1099-INT)",
        "tl": "Kita mula sa Interes (1099-INT)"
    },
    "dividend_income": {
        "en": "Dividend Income (1099-DIV)",
        "es": "Ingresos por dividendos (1099-DIV)",
        "vi": "Thu nhập cổ tức (1099-DIV)",
        "zh": "股息收入 (1099-DIV)",
        "ko": "배당 소득 (1099-DIV)",
        "tl": "Kita mula sa Dibidendo (1099-DIV)"
    },
    "social_security": {
        "en": "Social Security Benefits (SSA-1099)",
        "es": "Beneficios del Seguro Social (SSA-1099)",
        "vi": "Trợ cấp An Sinh Xã Hội (SSA-1099)",
        "zh": "社会保障金 (SSA-1099)",
        "ko": "사회보장 급여 (SSA-1099)",
        "tl": "Benepisyo ng Social Security (SSA-1099)"
    },
    "retirement_income": {
        "en": "Retirement Income (1099-R)",
        "es": "Ingresos de jubilación (1099-R)",
        "vi": "Thu nhập hưu trí (1099-R)",
        "zh": "退休收入 (1099-R)",
        "ko": "은퇴 소득 (1099-R)",
        "tl": "Kita mula sa Pagreretiro (1099-R)"
    },
    
    # ==================== DEDUCTIONS ====================
    "deduction": {
        "en": "Deduction",
        "es": "Deducción",
        "vi": "Khấu trừ",
        "zh": "扣除",
        "ko": "공제",
        "tl": "Bawas"
    },
    "standard_deduction": {
        "en": "Standard Deduction",
        "es": "Deducción estándar",
        "vi": "Khấu trừ tiêu chuẩn",
        "zh": "标准扣除",
        "ko": "표준 공제",
        "tl": "Karaniwang Bawas"
    },
    "itemized_deduction": {
        "en": "Itemized Deduction",
        "es": "Deducciones detalladas",
        "vi": "Khấu trừ từng khoản",
        "zh": "逐项扣除",
        "ko": "항목별 공제",
        "tl": "Nakalistang Bawas"
    },
    
    # ==================== TAX ====================
    "tax": {
        "en": "Tax",
        "es": "Impuesto",
        "vi": "Thuế",
        "zh": "税",
        "ko": "세금",
        "tl": "Buwis"
    },
    "federal_tax": {
        "en": "Federal Tax",
        "es": "Impuesto federal",
        "vi": "Thuế liên bang",
        "zh": "联邦税",
        "ko": "연방세",
        "tl": "Buwis Pederal"
    },
    "state_tax": {
        "en": "State Tax",
        "es": "Impuesto estatal",
        "vi": "Thuế tiểu bang",
        "zh": "州税",
        "ko": "주세",
        "tl": "Buwis ng Estado"
    },
    "self_employment_tax": {
        "en": "Self-Employment Tax",
        "es": "Impuesto de trabajo por cuenta propia",
        "vi": "Thuế tự kinh doanh",
        "zh": "自雇税",
        "ko": "자영업 세금",
        "tl": "Buwis sa Sariling Negosyo"
    },
    
    # ==================== CREDITS ====================
    "credits": {
        "en": "Credits",
        "es": "Créditos",
        "vi": "Tín dụng thuế",
        "zh": "税收抵免",
        "ko": "세금 공제",
        "tl": "Mga Kredito"
    },
    "child_tax_credit": {
        "en": "Child Tax Credit",
        "es": "Crédito tributario por hijos",
        "vi": "Tín dụng thuế con cái",
        "zh": "儿童税收抵免",
        "ko": "자녀 세금 공제",
        "tl": "Kredito sa Buwis para sa Anak"
    },
    "earned_income_credit": {
        "en": "Earned Income Credit",
        "es": "Crédito por ingreso del trabajo",
        "vi": "Tín dụng thu nhập kiếm được",
        "zh": "劳动所得税抵免",
        "ko": "근로 소득 공제",
        "tl": "Kredito sa Kinitang Kita"
    },
    
    # ==================== RESULTS ====================
    "refund": {
        "en": "Refund",
        "es": "Reembolso",
        "vi": "Hoàn thuế",
        "zh": "退税",
        "ko": "환급",
        "tl": "Refund"
    },
    "amount_owed": {
        "en": "Amount Owed",
        "es": "Cantidad a pagar",
        "vi": "Số tiền nợ",
        "zh": "应付金额",
        "ko": "납부해야 할 금액",
        "tl": "Halagang Dapat Bayaran"
    },
    "total_income": {
        "en": "Total Income",
        "es": "Ingreso total",
        "vi": "Tổng thu nhập",
        "zh": "总收入",
        "ko": "총 소득",
        "tl": "Kabuuang Kita"
    },
    "taxable_income": {
        "en": "Taxable Income",
        "es": "Ingreso gravable",
        "vi": "Thu nhập chịu thuế",
        "zh": "应税收入",
        "ko": "과세 소득",
        "tl": "Kitang Mapapabuwisan"
    },
    
    # ==================== DEPENDENTS ====================
    "dependents": {
        "en": "Dependents",
        "es": "Dependientes",
        "vi": "Người phụ thuộc",
        "zh": "受抚养人",
        "ko": "부양가족",
        "tl": "Mga Dependent"
    },
    "dependent_name": {
        "en": "Dependent Name",
        "es": "Nombre del dependiente",
        "vi": "Tên người phụ thuộc",
        "zh": "受抚养人姓名",
        "ko": "부양가족 이름",
        "tl": "Pangalan ng Dependent"
    },
    "dependent_age": {
        "en": "Dependent Age",
        "es": "Edad del dependiente",
        "vi": "Tuổi người phụ thuộc",
        "zh": "受抚养人年龄",
        "ko": "부양가족 나이",
        "tl": "Edad ng Dependent"
    },
    
    # ==================== INTERVIEW MESSAGES ====================
    "welcome_message": {
        "en": "Welcome to TaxSky 2025! I'll help you file your taxes step by step.",
        "es": "¡Bienvenido a TaxSky 2025! Te ayudaré a presentar tus impuestos paso a paso.",
        "vi": "Chào mừng đến với TaxSky 2025! Tôi sẽ giúp bạn khai thuế từng bước.",
        "zh": "欢迎使用TaxSky 2025！我将帮助您逐步报税。",
        "ko": "TaxSky 2025에 오신 것을 환영합니다! 단계별로 세금 신고를 도와드리겠습니다.",
        "tl": "Maligayang pagdating sa TaxSky 2025! Tutulungan kitang mag-file ng iyong buwis nang hakbang-hakbang."
    },
    "ask_filing_status": {
        "en": "What is your filing status?",
        "es": "¿Cuál es su estado civil tributario?",
        "vi": "Tình trạng khai thuế của bạn là gì?",
        "zh": "您的报税身份是什么？",
        "ko": "신고 상태가 어떻게 되십니까?",
        "tl": "Ano ang iyong katayuan sa pag-file?"
    },
    "ask_dependents": {
        "en": "Do you have any dependents?",
        "es": "¿Tiene dependientes?",
        "vi": "Bạn có người phụ thuộc không?",
        "zh": "您有受抚养人吗？",
        "ko": "부양가족이 있으십니까?",
        "tl": "Mayroon ka bang mga dependent?"
    },
    "ask_state": {
        "en": "What state do you live in?",
        "es": "¿En qué estado vive?",
        "vi": "Bạn sống ở tiểu bang nào?",
        "zh": "您住在哪个州？",
        "ko": "어느 주에 거주하십니까?",
        "tl": "Saang estado ka nakatira?"
    },
    "ask_income": {
        "en": "Let's collect your income information.",
        "es": "Vamos a recopilar su información de ingresos.",
        "vi": "Hãy thu thập thông tin thu nhập của bạn.",
        "zh": "让我们收集您的收入信息。",
        "ko": "소득 정보를 수집하겠습니다.",
        "tl": "Kolektahin natin ang iyong impormasyon sa kita."
    },
    
    # ==================== ERRORS ====================
    "error_invalid_state": {
        "en": "Invalid state code. Please enter a valid US state.",
        "es": "Código de estado no válido. Ingrese un estado válido de EE. UU.",
        "vi": "Mã tiểu bang không hợp lệ. Vui lòng nhập tiểu bang Hoa Kỳ hợp lệ.",
        "zh": "无效的州代码。请输入有效的美国州。",
        "ko": "유효하지 않은 주 코드입니다. 유효한 미국 주를 입력하세요.",
        "tl": "Hindi valid ang code ng estado. Maglagay ng valid na estado ng US."
    },
    "error_missing_data": {
        "en": "Missing required information.",
        "es": "Falta información requerida.",
        "vi": "Thiếu thông tin bắt buộc.",
        "zh": "缺少必填信息。",
        "ko": "필수 정보가 누락되었습니다.",
        "tl": "Kulang ang kinakailangang impormasyon."
    },
    
    # ==================== NO TAX STATES ====================
    "no_state_tax": {
        "en": "has no state income tax",
        "es": "no tiene impuesto sobre la renta estatal",
        "vi": "không có thuế thu nhập tiểu bang",
        "zh": "没有州所得税",
        "ko": "주 소득세가 없습니다",
        "tl": "walang buwis sa kita ng estado"
    }
}

# ============================================================
# TRANSLATION FUNCTIONS
# ============================================================
def get_translation(key: str, language: str = "en") -> str:
    """Get translation for a key in specified language"""
    if key not in TRANSLATIONS:
        return key
    
    translations = TRANSLATIONS[key]
    return translations.get(language, translations.get("en", key))

def translate(key: str, language: str = "en", **kwargs) -> str:
    """Get translation with optional string formatting"""
    text = get_translation(key, language)
    if kwargs:
        try:
            return text.format(**kwargs)
        except:
            return text
    return text

def get_all_translations(language: str = "en") -> Dict[str, str]:
    """Get all translations for a language"""
    return {key: get_translation(key, language) for key in TRANSLATIONS}

def is_supported_language(language: str) -> bool:
    """Check if language is supported"""
    return language in SUPPORTED_LANGUAGES

def get_supported_languages() -> Dict[str, str]:
    """Get list of supported languages"""
    return SUPPORTED_LANGUAGES.copy()

# ============================================================
# LOCALIZED MESSAGES BUILDER
# ============================================================
class LocalizedMessages:
    """Helper class for building localized messages"""
    
    def __init__(self, language: str = "en"):
        self.lang = language if is_supported_language(language) else "en"
    
    def t(self, key: str, **kwargs) -> str:
        """Translate a key"""
        return translate(key, self.lang, **kwargs)
    
    def filing_status_name(self, status: str) -> str:
        """Get localized filing status name"""
        return self.t(status)
    
    def format_currency(self, amount: float) -> str:
        """Format currency for locale"""
        return f"${amount:,.2f}"
    
    def tax_summary(self, data: Dict[str, Any]) -> str:
        """Build localized tax summary"""
        lines = [
            f"📋 **{self.t('tax')} 2025**",
            "",
            f"**{self.t('filing_status')}:** {self.filing_status_name(data.get('filing_status', 'single'))}",
            f"**{self.t('total_income')}:** {self.format_currency(data.get('total_income', 0))}",
            f"**{self.t('taxable_income')}:** {self.format_currency(data.get('taxable_income', 0))}",
            f"**{self.t('federal_tax')}:** {self.format_currency(data.get('federal_tax', 0))}",
            ""
        ]
        
        refund = data.get('refund', 0)
        owed = data.get('amount_owed', 0)
        
        if refund > 0:
            lines.append(f"✅ **{self.t('refund')}:** {self.format_currency(refund)}")
        elif owed > 0:
            lines.append(f"⚠️ **{self.t('amount_owed')}:** {self.format_currency(owed)}")
        
        return "\n".join(lines)
