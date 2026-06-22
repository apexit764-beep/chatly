import { create } from 'zustand';

export interface Category {
  id: string;
  name: string;
  description?: string;
  articleCount: number;
}

export interface Article {
  id: string;
  title: string;
  content: string;
  categoryId: string;
  status: 'published' | 'draft';
  author: string;
  updatedAt: string;
  views: number;
}

interface KnowledgeState {
  categories: Category[];
  articles: Article[];
  
  // Actions
  addArticle: (article: Omit<Article, 'id' | 'updatedAt' | 'views'>) => void;
  updateArticle: (id: string, article: Partial<Article>) => void;
  deleteArticle: (id: string) => void;
  addCategory: (name: string) => void;
}

const MOCK_CATEGORIES: Category[] = [
  { id: 'c1', name: 'الأسئلة العامة', description: 'أسئلة شائعة حول استخدام المنصة بشكل عام', articleCount: 3 },
  { id: 'c2', name: 'الفواتير والدفع', description: 'كل ما يخص الاشتراكات، الفواتير، وطرق الدفع', articleCount: 2 },
  { id: 'c3', name: 'الدعم الفني', description: 'حلول للمشاكل التقنية المعتادة', articleCount: 1 },
];

const MOCK_ARTICLES: Article[] = [
  {
    id: 'a1',
    title: 'كيف أقوم بتغيير باقة الاشتراك الخاصة بي؟',
    content: 'يمكنك تغيير الباقة الخاصة بك من خلال الذهاب إلى صفحة "الباقات والاشتراك" من القائمة الجانبية، ثم اختيار الباقة الجديدة والضغط على "ترقية الباقة". سيتم حساب الفارق الزمني وإضافته أو خصمه من رصيدك.',
    categoryId: 'c2',
    status: 'published',
    author: 'أحمد محمود',
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    views: 1240,
  },
  {
    id: 'a2',
    title: 'كيف أربط حساب الواتساب بالمنصة؟',
    content: 'لربط حساب الواتساب، اذهب إلى "الحسابات والربط"، اختر "واتساب"، ثم قم بمسح الـ QR Code الذي يظهر على الشاشة من خلال تطبيق واتساب في هاتفك عبر خيار "الأجهزة المرتبطة".',
    categoryId: 'c1',
    status: 'published',
    author: 'سارة خالد',
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    views: 345,
  },
  {
    id: 'a3',
    title: 'ما هي أوقات عمل المساعد الذكي؟',
    content: 'المساعد الذكي يعمل على مدار الساعة (24/7) ما لم تقم بتحديد ساعات عمل محددة من صفحة "إعدادات الذكاء الاصطناعي". في حال تحديد ساعات معينة، سيقوم المساعد بتحويل المحادثات خارج أوقات الدوام لرسالة خارج الدوام.',
    categoryId: 'c1',
    status: 'published',
    author: 'أحمد محمود',
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    views: 890,
  },
  {
    id: 'a4',
    title: 'المتصفح لا يعرض الإشعارات الجديدة',
    content: 'تأكد من السماح للمتصفح بإرسال إشعارات لموقعنا. يمكنك التحقق من ذلك من خلال النقر على أيقونة القفل بجانب شريط العنوان في المتصفح، ثم السماح بخيار "الإشعارات" (Notifications).',
    categoryId: 'c3',
    status: 'draft',
    author: 'يوسف العلي',
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    views: 0,
  },
];

export const useKnowledgeStore = create<KnowledgeState>((set) => ({
  categories: MOCK_CATEGORIES,
  articles: MOCK_ARTICLES,
  
  addArticle: (data) => set((state) => {
    const newArticle: Article = {
      ...data,
      id: `a${Date.now()}`,
      updatedAt: new Date().toISOString(),
      views: 0,
    };
    
    // Update category count
    const categories = state.categories.map(c => 
      c.id === data.categoryId ? { ...c, articleCount: c.articleCount + 1 } : c
    );
    
    return { articles: [newArticle, ...state.articles], categories };
  }),
  
  updateArticle: (id, data) => set((state) => ({
    articles: state.articles.map(a => a.id === id ? { ...a, ...data, updatedAt: new Date().toISOString() } : a)
  })),
  
  deleteArticle: (id) => set((state) => {
    const article = state.articles.find(a => a.id === id);
    if (!article) return state;
    
    // Update category count
    const categories = state.categories.map(c => 
      c.id === article.categoryId ? { ...c, articleCount: Math.max(0, c.articleCount - 1) } : c
    );
    
    return {
      articles: state.articles.filter(a => a.id !== id),
      categories
    };
  }),
  
  addCategory: (name) => set((state) => ({
    categories: [...state.categories, {
      id: `c${Date.now()}`,
      name,
      articleCount: 0
    }]
  }))
}));
