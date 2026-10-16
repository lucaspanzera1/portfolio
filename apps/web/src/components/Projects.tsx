import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, FileText, Filter, ArrowDownUp, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { projectsData } from '../data/projects';
import { HowItReachesYou } from './HowItReachesYou';
import { listArticles, articleExcerpt, articleTitle, articleBody } from '../lib/articles';
import { listTags, primaryTagInfo, translateTagLabel, type Tag } from '../lib/tags';

interface ProjectsProps {
  lang: 'EN' | 'PT';
}

interface CardItem {
  key: string;
  title: string;
  description: string;
  category: string;
  categoryIcon: string | null;
  tags: string[];
  originalTags: string[];
  link: string;
  createdAt: string;
  updatedAt: string;
  views: number;
  upvotes: number;
}

export function Projects({ lang }: ProjectsProps) {
  const currentContent = projectsData[lang];
  const [articleItems, setArticleItems] = useState<CardItem[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters state
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
        setIsTagDropdownOpen(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    listTags().then(setTags).catch(() => {});
  }, []);

  useEffect(() => {
    setIsLoading(true);
    listArticles()
      .then(articles => {
        setArticleItems(
          articles.map(article => {
            const info = primaryTagInfo(article.tags, tags, lang);
            return {
              key: `article-${article._id}`,
              title: articleTitle(article, lang),
              description: articleExcerpt(articleBody(article, lang)),
              category: info?.name ?? (lang === 'EN' ? 'Article' : 'Artigo'),
              categoryIcon: info?.icon ?? null,
              tags: article.tags.map(tag => translateTagLabel(tags, tag, lang)),
              originalTags: article.tags,
              link: `/articles/${article.slug}`,
              createdAt: article.createdAt,
              updatedAt: article.updatedAt,
              views: article.views || 0,
              upvotes: article.upvotes || 0,
            };
          }),
        );
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, [lang, tags]);

  // Highlighted: top 4 newest
  const highlightedItems = [...articleItems]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  // Filter and sort for the "All Projects" list
  let filteredItems = [...articleItems];
  if (selectedTag !== 'all') {
    filteredItems = filteredItems.filter(item => item.originalTags.includes(selectedTag));
  }

  filteredItems.sort((a, b) => {
    switch (sortBy) {
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'most_viewed':
        return b.views - a.views;
      case 'most_liked':
        return b.upvotes - a.upvotes;
      case 'recently_edited':
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case 'newest':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const renderCard = (item: CardItem, index: number, compact: boolean = false) => (
    <motion.div
      layout
      key={item.key}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20, transition: { delay: 0, duration: 0.2 } }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        to={item.link}
        className="group relative flex flex-col justify-between h-full p-6 bg-white dark:bg-[#151515] border border-neutral-200 dark:border-neutral-800 hover:border-neutral-900 dark:hover:border-neutral-300 transition-colors duration-300"
      >
        {/* Top accent line */}
        <div className="absolute top-0 left-0 w-0 h-[2px] bg-neutral-900 dark:bg-white transition-all duration-300 group-hover:w-full" />

        <div>
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center shrink-0 bg-neutral-100 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-400 group-hover:bg-neutral-900 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-neutral-900 transition-colors">
                {item.categoryIcon ? (
                  <span className="material-symbols-outlined text-[15px] leading-none">{item.categoryIcon}</span>
                ) : (
                  <FileText className="w-4 h-4" />
                )}
              </div>
              <span className="font-mono text-xs tracking-widest uppercase text-neutral-500 dark:text-neutral-400 transition-colors">
                {item.category}
              </span>
            </div>
            <ExternalLink className="w-4 h-4 text-neutral-300 dark:text-neutral-600 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors" />
          </div>

          <h3 className="text-xl font-medium text-neutral-900 dark:text-white mb-3 group-hover:underline decoration-1 underline-offset-4 transition-colors">
            {item.title}
          </h3>
          {!compact && (
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-sm mb-8 transition-colors">
              {item.description}
            </p>
          )}
        </div>

        <div className={`flex flex-wrap gap-2 mt-auto ${compact ? 'pt-6' : ''}`}>
          {item.tags.map(tag => (
            <span key={tag} className="px-2 py-1 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-mono text-[10px] uppercase tracking-wider transition-colors">
              {tag}
            </span>
          ))}
        </div>
      </Link>
    </motion.div>
  );

  return (
    <section id="projects" className="w-full">
      <div className="max-w-5xl mx-auto px-6 min-h-[100dvh] flex flex-col justify-start py-24">
        {/* Highlights Section */}
        <div className="mb-16 border-b border-black/10 dark:border-white/10 pb-8 transition-colors duration-300">
          <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white mb-2 transition-colors duration-300">{currentContent.sectionTitle}</h2>
          <p className="text-neutral-500 dark:text-neutral-400 font-mono text-sm transition-colors duration-300">{currentContent.sectionSubtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col justify-between h-full p-6 bg-white dark:bg-[#151515] border border-neutral-200 dark:border-neutral-800 animate-pulse min-h-[250px] transition-colors duration-300">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-800 rounded-sm transition-colors duration-300" />
                    <div className="w-16 h-4 bg-neutral-200 dark:bg-neutral-800 rounded-sm transition-colors duration-300" />
                  </div>
                </div>
                <div className="w-3/4 h-6 bg-neutral-200 dark:bg-neutral-800 mb-3 rounded-sm transition-colors duration-300" />
                <div className="w-full h-4 bg-neutral-200 dark:bg-neutral-800 mb-2 rounded-sm transition-colors duration-300" />
                <div className="w-5/6 h-4 bg-neutral-200 dark:bg-neutral-800 mb-8 rounded-sm transition-colors duration-300" />
              </div>
              <div className="flex gap-2 mt-auto">
                <div className="w-12 h-6 bg-neutral-200 dark:bg-neutral-800 rounded-sm transition-colors duration-300" />
                <div className="w-16 h-6 bg-neutral-200 dark:bg-neutral-800 rounded-sm transition-colors duration-300" />
              </div>
            </div>
          ))
        ) : (
          <>
            {highlightedItems.map((item, index) => renderCard(item, index))}
            {!isLoading && highlightedItems.length < 4 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: highlightedItems.length * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className={`flex flex-col justify-center items-center h-full p-8 border border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/20 text-center min-h-[250px] transition-colors duration-300 ${[0, 2].includes(highlightedItems.length) ? 'md:col-span-2' : ''}`}
              >
                <div className="w-12 h-12 mb-4 flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500">
                  <span className="material-symbols-outlined text-[20px]">hourglass_empty</span>
                </div>
                <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2 font-mono tracking-tight">{currentContent.comingSoonTitle}</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm">{currentContent.comingSoonDesc}</p>
              </motion.div>
            )}
          </>
        )}
      </div>

      </div>

      <HowItReachesYou lang={lang} />

      {/* Filterable Section */}
      <div className="max-w-5xl mx-auto px-6 py-24">
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-black/10 dark:border-white/10 pb-8 transition-colors duration-300">
        <div>
          <h3 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white mb-2 transition-colors duration-300">{currentContent.allProjectsTitle}</h3>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Tags Dropdown */}
          <div className="relative" ref={tagDropdownRef}>
            <button 
              onClick={() => { setIsTagDropdownOpen(!isTagDropdownOpen); setIsSortDropdownOpen(false); }}
              className="flex items-center justify-between gap-3 border border-neutral-200 dark:border-neutral-800 px-4 py-2 bg-white dark:bg-[#151515] hover:border-neutral-900 dark:hover:border-neutral-300 transition-colors duration-300 min-w-[180px] sm:min-w-[200px] w-full"
            >
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                <span className="text-sm font-mono text-neutral-900 dark:text-white flex items-center gap-2">
                  {selectedTag === 'all' 
                    ? currentContent.allTags 
                    : (
                      <>
                        {tags.find(t => t.name === selectedTag)?.icon && (
                          <span className="material-symbols-outlined text-[16px] leading-none">{tags.find(t => t.name === selectedTag)?.icon}</span>
                        )}
                        {lang === 'EN' && tags.find(t => t.name === selectedTag)?.nameEn ? tags.find(t => t.name === selectedTag)?.nameEn : selectedTag}
                      </>
                    )
                  }
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${isTagDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            <AnimatePresence>
              {isTagDropdownOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute z-20 top-full mt-2 left-0 w-full min-w-[220px] bg-white dark:bg-[#151515] border border-neutral-200 dark:border-neutral-800 shadow-xl max-h-60 overflow-y-auto"
                >
                  <button
                    onClick={() => { setSelectedTag('all'); setIsTagDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-3 flex items-center gap-2 text-sm font-mono hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors ${selectedTag === 'all' ? 'bg-neutral-50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white' : 'text-neutral-600 dark:text-neutral-400'}`}
                  >
                    {currentContent.allTags}
                  </button>
                  {tags.map(tag => (
                    <button
                      key={tag._id}
                      onClick={() => { setSelectedTag(tag.name); setIsTagDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 text-sm font-mono hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors ${selectedTag === tag.name ? 'bg-neutral-50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white' : 'text-neutral-600 dark:text-neutral-400'}`}
                    >
                      {tag.icon ? (
                         <span className="material-symbols-outlined text-[16px] leading-none shrink-0">{tag.icon}</span>
                      ) : (
                         <div className="w-[16px] h-[16px]" />
                      )}
                      <span className="truncate">
                        {lang === 'EN' && tag.nameEn ? tag.nameEn : tag.name}
                      </span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Sort Dropdown */}
          <div className="relative" ref={sortDropdownRef}>
            <button 
              onClick={() => { setIsSortDropdownOpen(!isSortDropdownOpen); setIsTagDropdownOpen(false); }}
              className="flex items-center justify-between gap-3 border border-neutral-200 dark:border-neutral-800 px-4 py-2 bg-white dark:bg-[#151515] hover:border-neutral-900 dark:hover:border-neutral-300 transition-colors duration-300 min-w-[180px] sm:min-w-[200px] w-full"
            >
              <div className="flex items-center gap-2">
                <ArrowDownUp className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                <span className="text-sm font-mono text-neutral-900 dark:text-white">
                  {sortBy === 'newest' && currentContent.sortNewest}
                  {sortBy === 'oldest' && currentContent.sortOldest}
                  {sortBy === 'most_viewed' && currentContent.sortMostViewed}
                  {sortBy === 'most_liked' && currentContent.sortMostLiked}
                  {sortBy === 'recently_edited' && currentContent.sortRecentlyEdited}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${isSortDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            <AnimatePresence>
              {isSortDropdownOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute z-20 top-full mt-2 sm:right-0 sm:left-auto left-0 w-full min-w-[200px] bg-white dark:bg-[#151515] border border-neutral-200 dark:border-neutral-800 shadow-xl"
                >
                  {[
                    { id: 'newest', label: currentContent.sortNewest },
                    { id: 'oldest', label: currentContent.sortOldest },
                    { id: 'most_viewed', label: currentContent.sortMostViewed },
                    { id: 'most_liked', label: currentContent.sortMostLiked },
                    { id: 'recently_edited', label: currentContent.sortRecentlyEdited },
                  ].map(option => (
                    <button
                      key={option.id}
                      onClick={() => { setSortBy(option.id); setIsSortDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-3 flex items-center gap-2 text-sm font-mono hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors ${sortBy === option.id ? 'bg-neutral-50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white' : 'text-neutral-600 dark:text-neutral-400'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {!isLoading && filteredItems.length === 0 && (
          <motion.div
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="col-span-full py-12 text-center text-neutral-500 dark:text-neutral-400 font-mono text-sm"
          >
            {currentContent.noResults}
          </motion.div>
        )}
        
        <AnimatePresence mode="popLayout">
          {!isLoading && filteredItems.map((item, index) => renderCard(item, index, true))}
        </AnimatePresence>
      </motion.div>
      </div>
    </section>
  );
}
