import { useMemo, useState } from 'react';
import { Search, ChevronLeft, BookOpen, Clock } from 'lucide-react';
import { Card } from '@components/ui';
import { useKnowledgeStore, type Article } from '@/store/useKnowledgeStore';
import { cn } from '@/utils/cn';

export default function KnowledgeBase(): JSX.Element {
  const { articles, categories } = useKnowledgeStore();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const filtered = useMemo(() => {
    let list = articles;
    if (selectedCategory) list = list.filter((a) => a.categoryId === selectedCategory);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((a) => a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q));
    }
    return list;
  }, [articles, search, selectedCategory]);

  const goBack = (): void => {
    if (selectedArticle) { setSelectedArticle(null); return; }
    if (selectedCategory) { setSelectedCategory(null); return; }
  };

  // === Article view ===
  if (selectedArticle) {
    const cat = categories.find((c) => c.id === selectedArticle.categoryId);
    return (
      <div className="p-4 lg:p-6 space-y-5 page-fade">
        <button onClick={goBack} className="flex items-center gap-1.5 text-small text-primary hover:underline font-medium">
          <ChevronLeft className="h-4 w-4" />
          العودة للمقالات
        </button>

        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-small text-muted-light dark:text-muted-dark mb-3">
            {cat && <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-[11px] font-bold">{cat.icon} {cat.name}</span>}
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> آخر تحديث: {selectedArticle.updatedAt}</span>
          </div>

          <h1 className="text-h1 font-extrabold leading-snug mb-6">{selectedArticle.title}</h1>

          <div className="prose-article text-body leading-[1.9] space-y-4">
            {selectedArticle.content.split('\n\n').map((block, i) => (
              <p key={i}>
                {block.split('\n').map((line, j) => (
                  <span key={j}>
                    {line.split(/(\*\*[^*]+\*\*)/).map((seg, k) =>
                      seg.startsWith('**') && seg.endsWith('**')
                        ? <strong key={k} className="font-bold">{seg.slice(2, -2)}</strong>
                        : seg
                    )}
                    {j < block.split('\n').length - 1 && <br />}
                  </span>
                ))}
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // === Category articles list ===
  if (selectedCategory) {
    const cat = categories.find((c) => c.id === selectedCategory);
    const catArticles = articles.filter((a) => a.categoryId === selectedCategory);
    return (
      <div className="p-4 lg:p-6 space-y-5 page-fade">
        <button onClick={goBack} className="flex items-center gap-1.5 text-small text-primary hover:underline font-medium">
          <ChevronLeft className="h-4 w-4" />
          كل التصنيفات
        </button>

        <div>
          <h1 className="text-h1 font-extrabold">{cat?.icon} {cat?.name}</h1>
          <p className="text-small text-muted-light dark:text-muted-dark mt-1">{catArticles.length} مقال</p>
        </div>

        <div className="space-y-2 max-w-3xl">
          {catArticles.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelectedArticle(a)}
              className="w-full text-start p-4 rounded-xl bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark hover:border-primary/40 transition-colors group"
            >
              <h3 className="text-body font-bold group-hover:text-primary transition-colors">{a.title}</h3>
              <p className="text-small text-muted-light dark:text-muted-dark mt-1.5 line-clamp-2 leading-relaxed">
                {a.content.replace(/\*\*/g, '').slice(0, 150)}...
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // === Home: categories + search ===
  return (
    <div className="p-4 lg:p-6 space-y-6 page-fade">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto pt-4">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 text-primary mb-4">
          <BookOpen className="h-7 w-7" />
        </div>
        <h1 className="text-h1 font-extrabold">مركز المساعدة</h1>
        <p className="text-body text-muted-light dark:text-muted-dark mt-2">
          ابحث في المقالات أو تصفّح حسب التصنيف للعثور على إجابة لسؤالك
        </p>

        {/* Search */}
        <div className="relative mt-5 max-w-lg mx-auto">
          <Search className="h-4.5 w-4.5 absolute end-4 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark pointer-events-none" />
          <input
            type="text"
            placeholder="ابحث عن موضوع... مثال: ربط واتساب"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 ps-5 pe-12 rounded-2xl bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark text-body focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary shadow-sm transition-all"
          />
        </div>
      </div>

      {/* Search results */}
      {search ? (
        <div className="max-w-3xl mx-auto space-y-2">
          <p className="text-small text-muted-light dark:text-muted-dark mb-3">
            {filtered.length} نتيجة لـ "{search}"
          </p>
          {filtered.map((a) => {
            const cat = categories.find((c) => c.id === a.categoryId);
            return (
              <button
                key={a.id}
                onClick={() => { setSelectedArticle(a); setSearch(''); }}
                className="w-full text-start p-4 rounded-xl bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark hover:border-primary/40 transition-colors group"
              >
                <div className="flex items-center gap-2 mb-1">
                  {cat && <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{cat.icon} {cat.name}</span>}
                </div>
                <h3 className="text-body font-bold group-hover:text-primary transition-colors">{a.title}</h3>
                <p className="text-small text-muted-light dark:text-muted-dark mt-1 line-clamp-2 leading-relaxed">
                  {a.content.replace(/\*\*/g, '').slice(0, 150)}...
                </p>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-light dark:text-muted-dark">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-body font-semibold">لا توجد نتائج</p>
              <p className="text-small mt-1">جرّب البحث بكلمات مختلفة</p>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Category grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-3xl mx-auto">
            {categories.map((cat) => {
              const count = articles.filter((a) => a.categoryId === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    'p-5 rounded-2xl text-start transition-all group',
                    'bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark',
                    'hover:border-primary/40 hover:shadow-sm',
                  )}
                >
                  <span className="text-2xl mb-3 block">{cat.icon}</span>
                  <h3 className="text-body font-bold group-hover:text-primary transition-colors">{cat.name}</h3>
                  <p className="text-[11px] text-muted-light dark:text-muted-dark mt-1">{count} مقال</p>
                </button>
              );
            })}
          </div>

          {/* Popular articles */}
          <div className="max-w-3xl mx-auto">
            <h2 className="text-body font-bold mb-3">المقالات الأكثر قراءة</h2>
            <Card className="divide-y divide-border-light dark:divide-border-dark">
              {articles.slice(0, 5).map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedArticle(a)}
                  className="w-full text-start px-5 py-3.5 hover:bg-bg-light dark:hover:bg-bg-dark transition-colors group flex items-center gap-3"
                >
                  <span className="text-body font-medium group-hover:text-primary transition-colors flex-1">{a.title}</span>
                  <ChevronLeft className="h-4 w-4 text-muted-light dark:text-muted-dark opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
