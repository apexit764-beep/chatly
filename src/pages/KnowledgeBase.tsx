import { useMemo, useState } from 'react';
import {
  Search,
  ChevronLeft,
  BookOpen,
  Clock,
  Info,
  AlertTriangle,
  Rocket,
  Link2,
  MessageSquare,
  Bot,
  CreditCard,
  Users,
} from 'lucide-react';
import { Card } from '@components/ui';
import { useKnowledgeStore, type Article, type ContentBlock, type CategoryIconKey } from '@/store/useKnowledgeStore';
import { cn } from '@/utils/cn';

const CATEGORY_ICONS: Record<CategoryIconKey, typeof Rocket> = {
  rocket: Rocket,
  link: Link2,
  chat: MessageSquare,
  bot: Bot,
  card: CreditCard,
  team: Users,
};

export default function KnowledgeBase(): JSX.Element {
  const { articles, categories } = useKnowledgeStore();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(categories[0]?.id ?? '');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const filteredArticles = useMemo(() => {
    if (search) {
      const q = search.toLowerCase();
      return articles.filter((a) => a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q));
    }
    return articles.filter((a) => a.categoryId === selectedCategory);
  }, [articles, search, selectedCategory]);

  // === Article detail view ===
  if (selectedArticle) {
    const cat = categories.find((c) => c.id === selectedArticle.categoryId);
    return (
      <div className="p-4 lg:p-6 page-fade">
        <button
          onClick={() => setSelectedArticle(null)}
          className="flex items-center gap-1.5 text-small text-primary hover:underline font-medium mb-5"
        >
          <ChevronLeft className="h-4 w-4" />
          العودة للمقالات
        </button>

        <div className="max-w-3xl">
          {/* Meta */}
          <div className="flex items-center flex-wrap gap-2 text-small text-muted-light dark:text-muted-dark mb-4">
            {cat && (() => {
              const Icon = CATEGORY_ICONS[cat.icon];
              return (
                <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5" />
                  {cat.name}
                </span>
              );
            })()}
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              آخر تحديث: {selectedArticle.updatedAt}
            </span>
          </div>

          <h1 className="text-h1 font-extrabold leading-snug mb-6">{selectedArticle.title}</h1>

          <article className="space-y-5">
            {selectedArticle.blocks.map((block, i) => (
              <BlockRenderer key={i} block={block} />
            ))}
          </article>

          {/* Footer / Was this helpful? */}
          <div className="mt-10 pt-6 border-t border-border-light dark:border-border-dark">
            <p className="text-small text-muted-light dark:text-muted-dark mb-3">هل كان هذا المقال مفيداً؟</p>
            <div className="flex gap-2">
              <button className="h-9 px-4 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:border-success hover:text-success transition-colors">
                👍 نعم
              </button>
              <button className="h-9 px-4 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:border-danger hover:text-danger transition-colors">
                👎 لا
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === Main view: Categories sidebar + Articles list ===
  return (
    <div className="p-4 lg:p-6 page-fade h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-h1 font-extrabold">مركز المساعدة</h1>
          <p className="text-small text-muted-light dark:text-muted-dark mt-1">
            ابحث في المقالات أو تصفّح حسب التصنيف للعثور على إجابة لسؤالك
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="h-4 w-4 absolute end-3.5 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark pointer-events-none" />
          <input
            type="text"
            placeholder="ابحث في كل المقالات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 ps-4 pe-10 rounded-full bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark text-small focus:outline-none focus:border-primary shadow-sm transition-colors"
          />
        </div>
      </div>

      {/* Body: sidebar + list */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-5">
        {/* === Categories sidebar (right in RTL) === */}
        <aside className="w-full lg:w-64 flex-shrink-0">
          <Card className="p-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-light dark:text-muted-dark px-3 py-2">
              التصنيفات
            </p>
            <div className="flex flex-col gap-0.5">
              {categories.map((cat) => {
                const count = articles.filter((a) => a.categoryId === cat.id).length;
                const isActive = selectedCategory === cat.id && !search;
                const Icon = CATEGORY_ICONS[cat.icon];
                return (
                  <button
                    key={cat.id}
                    onClick={() => { setSelectedCategory(cat.id); setSearch(''); }}
                    className={cn(
                      'flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-small transition-colors text-start',
                      isActive
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'hover:bg-bg-light dark:hover:bg-bg-dark text-current',
                    )}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{cat.name}</span>
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0',
                        isActive
                          ? 'bg-primary text-white'
                          : 'bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark',
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>
        </aside>

        {/* === Articles list === */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          {/* List header */}
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="text-h3 font-bold">
              {search
                ? `نتائج البحث (${filteredArticles.length})`
                : categories.find((c) => c.id === selectedCategory)?.name}
            </h2>
            {!search && (
              <span className="text-small text-muted-light dark:text-muted-dark">
                {filteredArticles.length} مقال
              </span>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto min-h-0 pe-1 -me-1">
            {filteredArticles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-light dark:text-muted-dark text-center">
                <BookOpen className="h-12 w-12 mb-3 opacity-20" />
                <p className="text-body font-semibold">لا توجد مقالات</p>
                <p className="text-small mt-1">
                  {search ? 'جرّب البحث بكلمات مختلفة' : 'لا توجد مقالات في هذا التصنيف بعد'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredArticles.map((a) => {
                  const cat = categories.find((c) => c.id === a.categoryId);
                  return (
                    <button
                      key={a.id}
                      onClick={() => setSelectedArticle(a)}
                      className="w-full text-start p-4 rounded-xl bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark hover:border-primary/40 hover:shadow-sm transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-body font-bold group-hover:text-primary transition-colors leading-snug">
                            {a.title}
                          </h3>
                          <p className="text-small text-muted-light dark:text-muted-dark mt-1 line-clamp-2 leading-relaxed">
                            {a.excerpt}
                          </p>
                          <div className="flex items-center gap-3 mt-2.5 text-[11px] text-muted-light dark:text-muted-dark">
                            {search && cat && (
                              <span className="text-primary font-medium">{cat.name}</span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {a.updatedAt}
                            </span>
                          </div>
                        </div>
                        <ChevronLeft className="h-4 w-4 text-muted-light dark:text-muted-dark opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Block Renderer =====

function BlockRenderer({ block }: { block: ContentBlock }): JSX.Element | null {
  switch (block.type) {
    case 'heading':
      return <h2 className="text-h3 font-bold mt-2 leading-snug">{block.text}</h2>;

    case 'paragraph':
      return <p className="text-body leading-[1.9] text-current">{block.text}</p>;

    case 'list':
      return (
        <ul className="space-y-2 ps-5 list-disc text-body leading-[1.8] marker:text-primary">
          {block.items.map((item, i) => (
            <li key={i} className="ps-1">{item}</li>
          ))}
        </ul>
      );

    case 'numbered':
      return (
        <ol className="space-y-2.5">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3 items-start">
              <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-small font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span className="text-body leading-[1.8] flex-1">{item}</span>
            </li>
          ))}
        </ol>
      );

    case 'note':
      return (
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex gap-3">
          <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-small text-current leading-[1.8]">
            <strong className="font-bold">ملاحظة: </strong>
            {block.text}
          </p>
        </div>
      );

    case 'warning':
      return (
        <div className="p-4 rounded-xl bg-warning/5 border border-warning/30 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <p className="text-small text-current leading-[1.8]">
            <strong className="font-bold">تنبيه: </strong>
            {block.text}
          </p>
        </div>
      );

    case 'image':
      return (
        <figure className="my-2">
          <div className="rounded-xl overflow-hidden border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark">
            <img src={block.src} alt={block.alt} className="w-full h-auto block" />
          </div>
          {block.caption && (
            <figcaption className="text-small text-muted-light dark:text-muted-dark text-center mt-2 italic">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );

    default:
      return null;
  }
}
