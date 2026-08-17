import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Compass,
  Film,
  Flame,
  Heart,
  Home,
  Info,
  Languages,
  ListVideo,
  Menu,
  MonitorPlay,
  Play,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  TrendingUp,
  Tv,
  Volume2,
  X,
  Zap,
} from 'lucide-react';

const VIDEO_URL = 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

const titles = [
  {
    id: 1,
    title: 'تاج الجمر',
    english: 'Crown of Embers',
    image: '/assets/poster-ember-crown.jpg',
    type: 'أنمي',
    year: 2026,
    rating: 9.4,
    genre: ['أكشن', 'فانتازيا'],
    meta: 'الموسم 2 • الحلقة 8',
    badge: 'حلقة جديدة',
    quality: '4K',
    progress: 68,
    summary: 'بعد سقوط مملكة الشمس، تنطلق وريثة العرش الأخيرة في رحلة لاستعادة التاج الأسطوري قبل أن تبتلع الظلال العالم.',
  },
  {
    id: 2,
    title: 'مدينة النيون',
    english: 'Neon City',
    image: '/assets/poster-neon-city.jpg',
    type: 'فيلم',
    year: 2025,
    rating: 8.8,
    genre: ['خيال علمي', 'غموض'],
    meta: 'ساعتان و 14 دقيقة',
    badge: 'حصري',
    quality: '4K',
    progress: 34,
    summary: 'محققة تلاحق ذاكرة مسروقة عبر شوارع مدينة لا تنام، لتكتشف أن القضية مرتبطة بماضيها أكثر مما توقعت.',
  },
  {
    id: 3,
    title: 'حرّاس السماء',
    english: 'Guardians of the Sky',
    image: '/assets/poster-sky-guardians.jpg',
    type: 'أنمي',
    year: 2026,
    rating: 9.1,
    genre: ['مغامرة', 'عائلي'],
    meta: 'الموسم 1 • الحلقة 11',
    badge: 'الأكثر مشاهدة',
    quality: 'FHD',
    progress: 81,
    summary: 'شقيقان يكتشفان آخر تنين سماوي وينطلقان لحماية الجزر العائمة من عاصفة تهدد بابتلاعها.',
  },
  {
    id: 4,
    title: 'المدار الأخير',
    english: 'The Last Orbit',
    image: '/assets/poster-last-orbit.jpg',
    type: 'فيلم',
    year: 2026,
    rating: 8.7,
    genre: ['خيال علمي', 'دراما'],
    meta: 'ساعة و 52 دقيقة',
    badge: 'جديد',
    quality: '4K',
    progress: 22,
    summary: 'رائدة فضاء وحيدة تتلقى إشارة غامضة من الأرض بعد سنوات من انقطاع الاتصال، فتخاطر بكل شيء للعودة.',
  },
  {
    id: 5,
    title: 'حديقة القمر',
    english: 'Moonlit Garden',
    image: '/assets/poster-moon-garden.jpg',
    type: 'أنمي',
    year: 2025,
    rating: 9.0,
    genre: ['رومانسي', 'دراما'],
    meta: '12 حلقة',
    badge: 'مكتمل',
    quality: 'FHD',
    summary: 'رسالتان تصلان إلى الحديقة نفسها بفارق عشر سنوات، وتربطان قلبين لم يلتقيا بعد.',
  },
  {
    id: 6,
    title: 'صمت الكثبان',
    english: 'Silent Dunes',
    image: '/assets/poster-silent-dune.jpg',
    type: 'فيلم',
    year: 2024,
    rating: 8.5,
    genre: ['مغامرة', 'غموض'],
    meta: 'ساعتان و 06 دقائق',
    quality: '4K',
    summary: 'رحالة يعبر صحراء لا تنتهي بحثًا عن مدينة يقال إنها تظهر ليلة واحدة كل مئة عام.',
  },
  {
    id: 7,
    title: 'مطبخ الأرواح',
    english: 'Spirit Kitchen',
    image: '/assets/poster-spirit-kitchen.jpg',
    type: 'أنمي',
    year: 2026,
    rating: 8.9,
    genre: ['كوميديا', 'عائلي'],
    meta: 'الموسم 1 • الحلقة 6',
    badge: 'حلقة جديدة',
    quality: 'FHD',
    summary: 'طاهٍ مبتدئ يرث مطعمًا سحريًا لا يفتح أبوابه إلا للأرواح، ولكل زبون وصفة تعيد إليه ذكرى منسية.',
  },
  {
    id: 8,
    title: 'ريح الشمال',
    english: 'The North Wind',
    image: '/assets/poster-north-wind.jpg',
    type: 'فيلم',
    year: 2025,
    rating: 8.3,
    genre: ['غموض', 'دراما'],
    meta: 'ساعة و 47 دقيقة',
    badge: 'اختيار النقاد',
    quality: '4K',
    summary: 'تعود مصورة إلى قريتها القطبية بعد اختفاء والدها، فتقودها صورة قديمة إلى سر مخبأ في المنارة.',
  },
  {
    id: 9,
    title: 'ملحمة الظلال',
    english: 'Shadow Chronicle',
    image: '/assets/poster-ember-crown.jpg',
    type: 'أنمي',
    year: 2024,
    rating: 8.6,
    genre: ['أكشن', 'غموض'],
    meta: '24 حلقة',
    quality: 'FHD',
    position: '65% center',
    summary: 'محارب بلا اسم يطارد مخلوقات تولد من أسرار البشر، بينما يحاول تذكّر السر الذي محا هويته.',
  },
  {
    id: 10,
    title: 'بعد منتصف الليل',
    english: 'After Midnight',
    image: '/assets/poster-neon-city.jpg',
    type: 'فيلم',
    year: 2023,
    rating: 8.1,
    genre: ['جريمة', 'إثارة'],
    meta: 'ساعة و 58 دقيقة',
    quality: 'FHD',
    position: '30% center',
    summary: 'تتقاطع حكايات خمسة غرباء في ليلة ممطرة، قبل أن يكتشفوا أنهم يبحثون عن الشخص نفسه.',
  },
  {
    id: 11,
    title: 'أجنحة الفجر',
    english: 'Wings of Dawn',
    image: '/assets/poster-sky-guardians.jpg',
    type: 'أنمي',
    year: 2025,
    rating: 8.7,
    genre: ['فانتازيا', 'مغامرة'],
    meta: '13 حلقة',
    quality: 'FHD',
    position: '75% center',
    summary: 'متدربة شابة في أكاديمية الطيران تبحث عن الجزيرة التي اختفى فيها شقيقها قبل سبع سنوات.',
  },
  {
    id: 12,
    title: 'ما وراء النجوم',
    english: 'Beyond the Stars',
    image: '/assets/poster-last-orbit.jpg',
    type: 'فيلم',
    year: 2024,
    rating: 8.4,
    genre: ['خيال علمي', 'مغامرة'],
    meta: 'ساعتان و 21 دقيقة',
    quality: '4K',
    position: '70% center',
    summary: 'طاقم بعثة علمية يعثر على بوابة كونية تقود إلى مكان لم يكن من المفترض للبشر الوصول إليه.',
  },
];

const HERO_ITEM = {
  id: 99,
  title: 'ناسج الليل',
  english: 'The Night Weaver',
  image: '/assets/hero-night-weaver.jpg',
  type: 'فيلم',
  year: 2026,
  rating: 9.6,
  genre: ['خيال علمي', 'غموض'],
  meta: 'فيلم • ساعة و 56 دقيقة',
  badge: 'حصريًا على لُمعة',
  quality: '4K',
  summary: 'في مدينة تنام تحت ضوء قمرين، يكتشف رسّام شاب أن خطوطه تستطيع تغيير أحلام الناس، لكن لكل حلم يرسمه ثمن لا بد أن يدفعه.',
};

const genres = ['الكل', 'أكشن', 'مغامرة', 'خيال علمي', 'فانتازيا', 'دراما', 'غموض', 'رومانسي', 'كوميديا', 'عائلي'];
const navItems = ['الرئيسية', 'أفلام', 'أنمي', 'الأحدث', 'قائمتي'];

function Logo() {
  return (
    <div className="logo" aria-label="لُمعة">
      <span className="logo-mark"><span /></span>
      <strong>لُمعة</strong>
    </div>
  );
}

function Header({ activeNav, onNav, onSearch }) {
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <header className="topbar">
      <div className="header-inner shell">
        <button className="mobile-menu-button icon-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="القائمة">
          {mobileMenu ? <X size={21} /> : <Menu size={21} />}
        </button>
        <button className="brand-button" onClick={() => onNav('الرئيسية')} aria-label="العودة للرئيسية"><Logo /></button>
        <nav className={`main-nav ${mobileMenu ? 'is-open' : ''}`} aria-label="التنقل الرئيسي">
          {navItems.map((item) => (
            <button key={item} className={activeNav === item ? 'active' : ''} onClick={() => { onNav(item); setMobileMenu(false); }}>
              {item}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <button className="search-trigger" onClick={onSearch} aria-label="البحث">
            <Search size={18} />
            <span>ابحث عن فيلم أو أنمي...</span>
            <kbd>⌘ K</kbd>
          </button>
          <button className="icon-button notification-button" aria-label="الإشعارات">
            <Bell size={19} />
            <span className="notification-dot" />
          </button>
          <button className="profile-button" aria-label="الملف الشخصي">
            <span>م</span>
            <ChevronDown size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}

function Hero({ onWatch, onDetails, favorite, onFavorite }) {
  return (
    <section className="hero" aria-label="المحتوى المميز">
      <img className="hero-background" src="/assets/hero-night-weaver.jpg" alt="ناسج الليل" />
      <div className="hero-wash" />
      <div className="hero-content shell">
        <div className="hero-copy">
          <div className="eyebrow"><Sparkles size={15} /> حصريًا على لُمعة</div>
          <h1>ناسج <span>الليل</span></h1>
          <p className="hero-japanese">夜を紡ぐ者</p>
          <div className="metadata">
            <span className="rating"><Star size={15} fill="currentColor" /> 9.6</span>
            <span>2026</span>
            <span>16+</span>
            <span>فيلم</span>
            <span className="quality">4K</span>
          </div>
          <p className="hero-description">في مدينة تنام تحت ضوء قمرين، يكتشف رسّام شاب أن خطوطه تستطيع تغيير أحلام الناس… لكن لكل حلم ثمن.</p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => onWatch(HERO_ITEM)}>
              <Play size={19} fill="currentColor" /> شاهد الآن
            </button>
            <button className="secondary-button" onClick={() => onDetails(HERO_ITEM)}>
              <Info size={19} /> التفاصيل
            </button>
            <button className={`circle-action ${favorite ? 'saved' : ''}`} onClick={onFavorite} aria-label="إضافة ناسج الليل إلى قائمتي">
              {favorite ? <Check size={20} /> : <Plus size={20} />}
            </button>
          </div>
          <div className="audio-note"><Volume2 size={15} /> متوفر بالدبلجة العربية والترجمة</div>
        </div>
        <div className="hero-side-card">
          <div className="playing-pulse"><span /><i /></div>
          <div>
            <small>يعرض الآن</small>
            <strong>ناسج الليل</strong>
          </div>
          <span className="side-duration">01:56</span>
        </div>
      </div>
      <div className="hero-scroll shell">
        <span>اكتشف المزيد</span>
        <div className="scroll-line" />
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title, action, onAction, icon = Flame }) {
  return (
    <div className="section-heading">
      <div>
        <span className="section-kicker">{createElement(icon, { size: 16 })} {eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {action && <button className="text-action" onClick={onAction}>{action}<ChevronLeft size={18} /></button>}
    </div>
  );
}

function ContinueCard({ item, onWatch }) {
  return (
    <article className="continue-card">
      <button className="continue-image" onClick={() => onWatch(item)} aria-label={`متابعة ${item.title}`}>
        <img src={item.image} alt="" style={{ objectPosition: item.position }} />
        <span className="continue-overlay" />
        <span className="play-float"><Play size={19} fill="currentColor" /></span>
        <span className="remaining">متبقي {item.id === 1 ? '9 د' : item.id === 2 ? '56 د' : item.id === 3 ? '5 د' : '1 س 22 د'}</span>
        <span className="progress-track"><i style={{ width: `${item.progress}%` }} /></span>
      </button>
      <div className="continue-info">
        <div><strong>{item.title}</strong><span>{item.meta}</span></div>
        <button aria-label="حذف من المتابعة"><X size={17} /></button>
      </div>
    </article>
  );
}

function MediaCard({ item, rank, favorite, onFavorite, onWatch, onDetails }) {
  return (
    <article className="media-card">
      <button className="poster" onClick={() => onDetails(item)} aria-label={`تفاصيل ${item.title}`}>
        <img src={item.image} alt={`ملصق ${item.title}`} style={{ objectPosition: item.position }} />
        <span className="poster-shade" />
        {rank && <span className="rank">{rank}</span>}
        {item.badge && <span className="card-badge">{item.badge}</span>}
        <span className="quality-badge">{item.quality}</span>
        <span className="card-actions">
          <span className="card-play" role="button" tabIndex="0" onClick={(event) => { event.stopPropagation(); onWatch(item); }}><Play size={20} fill="currentColor" /></span>
          <span className={`card-save ${favorite ? 'active' : ''}`} role="button" tabIndex="0" onClick={(event) => { event.stopPropagation(); onFavorite(item.id); }}>
            {favorite ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
          </span>
        </span>
      </button>
      <div className="card-copy">
        <div className="card-title-row"><h3>{item.title}</h3><span><Star size={13} fill="currentColor" /> {item.rating}</span></div>
        <p>{item.year} <i /> {item.type} <i /> {item.genre[0]}</p>
      </div>
    </article>
  );
}

function FeatureStrip({ onWatch }) {
  return (
    <section className="feature-strip shell">
      <div className="feature-strip-visual">
        <img src="/assets/poster-spirit-kitchen.jpg" alt="مطبخ الأرواح" />
        <div className="feature-collage second"><img src="/assets/poster-moon-garden.jpg" alt="" /></div>
        <div className="feature-collage third"><img src="/assets/poster-sky-guardians.jpg" alt="" /></div>
      </div>
      <div className="feature-strip-copy">
        <span className="section-kicker"><Zap size={16} /> مجموعة نهاية الأسبوع</span>
        <h2>مغامرات صغيرة،<br /><em>عوالم لا تنتهي.</em></h2>
        <p>مختارات عائلية دافئة لأمسية مميزة. أكثر من 80 فيلمًا ومسلسلًا مدبلجًا بالعربية.</p>
        <button className="light-button" onClick={() => onWatch(titles[6])}><Play size={18} fill="currentColor" /> ابدأ المشاهدة</button>
      </div>
      <div className="feature-number">80<span>+</span></div>
    </section>
  );
}

function BrowseHeader({ activeGenre, setActiveGenre, count, filterType, setFilterType, title }) {
  return (
    <div className="browse-header">
      <SectionHeading eyebrow="المكتبة" title={title} icon={Compass} />
      <div className="catalog-tools">
        <div className="type-toggle">
          {['الكل', 'أفلام', 'أنمي'].map((type) => <button key={type} className={filterType === type ? 'active' : ''} onClick={() => setFilterType(type)}>{type}</button>)}
        </div>
        <button className="filter-button"><SlidersHorizontal size={17} /> تصفية <span>{count}</span></button>
      </div>
      <div className="genre-scroll">
        {genres.map((genre) => <button key={genre} className={activeGenre === genre ? 'active' : ''} onClick={() => setActiveGenre(genre)}>{genre}</button>)}
      </div>
    </div>
  );
}

function SearchModal({ onClose, onDetails, onWatch }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  useEffect(() => inputRef.current?.focus(), []);
  const normalizedTerms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const results = [HERO_ITEM, ...titles].filter((item) => {
    const searchable = `${item.title} ${item.english} ${item.genre.join(' ')} ${item.year} ${item.type} ${item.type === 'فيلم' ? 'أفلام' : ''}`.toLowerCase();
    return normalizedTerms.every((term) => searchable.includes(term));
  }).slice(0, 5);

  return (
    <div className="modal-layer search-layer" role="dialog" aria-modal="true" aria-label="البحث">
      <button className="modal-backdrop" onClick={onClose} aria-label="إغلاق" />
      <div className="search-modal">
        <div className="search-input-wrap">
          <Search size={22} />
          <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث باسم العمل أو التصنيف..." />
          <button onClick={onClose}><span>ESC</span><X size={18} /></button>
        </div>
        <div className="search-body">
          {!query ? (
            <>
              <p className="search-label">عمليات بحث شائعة</p>
              <div className="popular-searches">
                {['تاج الجمر', 'أفلام خيال علمي', 'أنمي جديد', 'مغامرات عائلية'].map((term) => <button key={term} onClick={() => setQuery(term)}><TrendingUp size={15} />{term}</button>)}
              </div>
              <div className="search-tip"><Sparkles size={18} /><span>جرّب البحث عن <strong>«أكشن»</strong> أو <strong>«2026»</strong></span></div>
            </>
          ) : results.length ? (
            <>
              <p className="search-label">{results.length} نتائج مطابقة</p>
              <div className="search-results">
                {results.map((item) => (
                  <article key={item.id}>
                    <button className="result-main" onClick={() => { onDetails(item); onClose(); }}>
                      <img src={item.image} alt="" />
                      <span><strong>{item.title}</strong><small>{item.english}</small><em>{item.year} • {item.type} • {item.genre[0]}</em></span>
                    </button>
                    <button className="result-play" onClick={() => { onWatch(item); onClose(); }}><Play size={16} fill="currentColor" /></button>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-search"><Search size={35} /><h3>لم نجد هذا العنوان</h3><p>جرّب اسمًا آخر أو تصنيفًا مختلفًا.</p></div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailsModal({ item, favorite, onFavorite, onWatch, onClose }) {
  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-label={`تفاصيل ${item.title}`}>
      <button className="modal-backdrop" onClick={onClose} aria-label="إغلاق" />
      <article className="details-modal">
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        <div className="details-art">
          <img src={item.image} alt="" style={{ objectPosition: item.position }} />
          <span />
          <div className="details-play-ring"><Play size={25} fill="currentColor" /></div>
        </div>
        <div className="details-copy">
          <span className="section-kicker"><Sparkles size={15} /> {item.badge || 'مختارات لُمعة'}</span>
          <h2>{item.title}</h2>
          <p className="details-english">{item.english}</p>
          <div className="metadata details-meta">
            <span className="rating"><Star size={14} fill="currentColor" /> {item.rating}</span>
            <span>{item.year}</span><span>{item.type}</span><span>16+</span><span className="quality">{item.quality}</span>
          </div>
          <p className="details-summary">{item.summary}</p>
          <div className="detail-tags">{item.genre.map((tag) => <span key={tag}>{tag}</span>)}<span>عربي</span></div>
          <div className="details-actions">
            <button className="primary-button" onClick={() => { onWatch(item); onClose(); }}><Play size={18} fill="currentColor" /> شاهد الآن</button>
            <button className={`save-detail ${favorite ? 'active' : ''}`} onClick={() => onFavorite(item.id)}>
              {favorite ? <BookmarkCheck size={18} /> : <Plus size={18} />}{favorite ? 'تمت الإضافة' : 'أضف لقائمتي'}
            </button>
          </div>
          <div className="detail-foot"><span><Languages size={16} /> ترجمة ودبلجة عربية</span><span><MonitorPlay size={16} /> يدعم حتى 4K</span></div>
        </div>
      </article>
    </div>
  );
}

function PlayerModal({ item, onClose }) {
  const [server, setServer] = useState('تلقائي');
  return (
    <div className="player-layer" role="dialog" aria-modal="true" aria-label={`مشاهدة ${item.title}`}>
      <div className="player-top">
        <div><button onClick={onClose}><X size={20} /></button><span><strong>{item.title}</strong><small>{item.meta}</small></span></div>
        <Logo />
      </div>
      <div className="player-shell">
        <div className="video-wrap">
          <video controls autoPlay playsInline poster={item.image}>
            <source src={VIDEO_URL} type="video/mp4" />
            متصفحك لا يدعم تشغيل الفيديو.
          </video>
          <span className="demo-label">عرض تجريبي مرخّص</span>
        </div>
        <div className="player-info">
          <div><span className="live-dot" /> <p><strong>المصدر</strong><small>اختر أفضل جودة لاتصالك</small></p></div>
          <div className="server-options">{['تلقائي', '1080p', '720p'].map((option) => <button key={option} className={server === option ? 'active' : ''} onClick={() => setServer(option)}>{server === option && <Check size={13} />}{option}</button>)}</div>
        </div>
        <p className="legal-note">هذا الفيديو نموذج مفتوح للاختبار. تُربط النسخة الإنتاجية بمزوّد محتوى مرخّص وواجهة بث آمنة.</p>
      </div>
    </div>
  );
}

function BottomNav({ activeNav, onNav, onSearch }) {
  const items = [
    ['الرئيسية', Home], ['استكشاف', Compass], ['بحث', Search], ['قائمتي', ListVideo],
  ];
  return (
    <nav className="bottom-nav">
      {items.map(([name, icon]) => <button key={name} className={(name === activeNav || (name === 'استكشاف' && ['أفلام', 'أنمي', 'الأحدث'].includes(activeNav))) ? 'active' : ''} onClick={() => name === 'بحث' ? onSearch() : onNav(name === 'استكشاف' ? 'أفلام' : name)}>{createElement(icon, { size: 20 })}<span>{name}</span></button>)}
    </nav>
  );
}

export default function App() {
  const [activeNav, setActiveNav] = useState('الرئيسية');
  const [activeGenre, setActiveGenre] = useState('الكل');
  const [filterType, setFilterType] = useState('الكل');
  const [searchOpen, setSearchOpen] = useState(false);
  const [detailsItem, setDetailsItem] = useState(null);
  const [watchItem, setWatchItem] = useState(null);
  const [visibleCount, setVisibleCount] = useState(8);
  const [toast, setToast] = useState('');
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lumaa-favorites')) || [3, 5]; }
    catch { return [3, 5]; }
  });

  useEffect(() => {
    localStorage.setItem('lumaa-favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearchOpen(true); }
      if (event.key === 'Escape') { setSearchOpen(false); setDetailsItem(null); setWatchItem(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = (searchOpen || detailsItem || watchItem) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [searchOpen, detailsItem, watchItem]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 2300);
    return () => clearTimeout(timer);
  }, [toast]);

  const toggleFavorite = (id) => {
    const exists = favorites.includes(id);
    setToast(exists ? 'تمت الإزالة من قائمتك' : 'تمت الإضافة إلى قائمتك');
    setFavorites((current) => exists ? current.filter((item) => item !== id) : [...current, id]);
  };

  const navigate = (item) => {
    setActiveNav(item);
    setActiveGenre('الكل');
    setVisibleCount(8);
    if (item === 'أفلام') setFilterType('أفلام');
    else if (item === 'أنمي') setFilterType('أنمي');
    else if (item === 'الرئيسية' || item === 'الأحدث' || item === 'قائمتي') setFilterType('الكل');
    if (item !== 'الرئيسية') setTimeout(() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredTitles = useMemo(() => {
    let items = activeNav === 'قائمتي' ? [HERO_ITEM, ...titles] : [...titles];
    if (activeNav === 'قائمتي') items = items.filter((item) => favorites.includes(item.id));
    if (activeNav === 'الأحدث') items = items.sort((a, b) => b.year - a.year);
    if (filterType !== 'الكل') items = items.filter((item) => item.type === (filterType === 'أفلام' ? 'فيلم' : 'أنمي'));
    if (activeGenre !== 'الكل') items = items.filter((item) => item.genre.includes(activeGenre));
    return items;
  }, [activeGenre, activeNav, favorites, filterType]);

  const pageTitle = activeNav === 'قائمتي' ? 'قائمتي المحفوظة' : activeNav === 'أفلام' ? 'أفضل الأفلام المختارة' : activeNav === 'أنمي' ? 'عالم الأنمي' : activeNav === 'الأحدث' ? 'أحدث الإضافات' : 'كل ما تحب، في مكان واحد';

  return (
    <div className="app">
      <Header activeNav={activeNav} onNav={navigate} onSearch={() => setSearchOpen(true)} />
      <main>
        <Hero
          onWatch={setWatchItem}
          onDetails={setDetailsItem}
          favorite={favorites.includes(99)}
          onFavorite={() => toggleFavorite(99)}
        />

        <section className="continue-section shell">
          <SectionHeading eyebrow="تابع من حيث توقفت" title="أكمل المشاهدة" action="عرض السجل" icon={Clock3} />
          <div className="continue-grid">
            {titles.slice(0, 4).map((item) => <ContinueCard key={item.id} item={item} onWatch={setWatchItem} />)}
          </div>
        </section>

        <section className="trending-section shell">
          <SectionHeading eyebrow="الأكثر رواجًا الآن" title="الجميع يتحدث عنها" action="عرض الكل" onAction={() => { setActiveNav('الأحدث'); document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' }); }} />
          <div className="trending-grid">
            {titles.slice(0, 6).map((item, index) => <MediaCard key={item.id} item={item} rank={index + 1} favorite={favorites.includes(item.id)} onFavorite={toggleFavorite} onWatch={setWatchItem} onDetails={setDetailsItem} />)}
          </div>
        </section>

        <FeatureStrip onWatch={setWatchItem} />

        <section className="catalog-section shell" id="catalog">
          <BrowseHeader activeGenre={activeGenre} setActiveGenre={setActiveGenre} count={filteredTitles.length} filterType={filterType} setFilterType={setFilterType} title={pageTitle} />
          {filteredTitles.length ? (
            <>
              <div className="catalog-grid">
                {filteredTitles.slice(0, visibleCount).map((item) => <MediaCard key={item.id} item={item} favorite={favorites.includes(item.id)} onFavorite={toggleFavorite} onWatch={setWatchItem} onDetails={setDetailsItem} />)}
              </div>
              {visibleCount < filteredTitles.length && <button className="load-more" onClick={() => setVisibleCount((count) => count + 4)}>عرض المزيد <ChevronDown size={18} /></button>}
            </>
          ) : (
            <div className="empty-library"><Heart size={37} /><h3>{activeNav === 'قائمتي' ? 'قائمتك تنتظر أول اختيار' : 'لا توجد نتائج في هذا التصنيف'}</h3><p>{activeNav === 'قائمتي' ? 'اضغط علامة الحفظ على أي فيلم أو أنمي ليظهر هنا.' : 'جرّب اختيار تصنيف آخر من القائمة.'}</p><button onClick={() => { setActiveGenre('الكل'); setFilterType('الكل'); navigate('الرئيسية'); }}>استكشف المكتبة</button></div>
          )}
        </section>

        <section className="stats shell">
          <div><strong>+12,000</strong><span>فيلم وحلقة</span></div>
          <i />
          <div><strong>4K</strong><span>جودة مشاهدة</span></div>
          <i />
          <div><strong>يوميًا</strong><span>إضافات جديدة</span></div>
          <i />
          <div><strong>عربي</strong><span>ترجمة ودبلجة</span></div>
        </section>
      </main>

      <footer className="footer">
        <div className="shell footer-main">
          <div className="footer-brand"><Logo /><p>قصص تستحق أن تُشاهد.<br />منصتك العربية للأفلام والأنمي.</p></div>
          <div><strong>استكشف</strong><button onClick={() => navigate('أفلام')}>الأفلام</button><button onClick={() => navigate('أنمي')}>الأنمي</button><button onClick={() => navigate('الأحدث')}>وصل حديثًا</button></div>
          <div><strong>لُمعة</strong><button>عن المنصة</button><button>مركز المساعدة</button><button>تواصل معنا</button></div>
          <div className="apps"><strong>شاهد أينما كنت</strong><p>تطبيقاتنا ستتوفر قريبًا</p><span><Tv size={19} /> Smart TV</span><span><Film size={19} /> جميع الأجهزة</span></div>
        </div>
        <div className="shell footer-bottom"><span>© 2026 لُمعة. جميع الحقوق محفوظة.</span><div><button>الخصوصية</button><button>الشروط</button><button>ملفات الارتباط</button></div></div>
      </footer>

      <BottomNav activeNav={activeNav} onNav={navigate} onSearch={() => setSearchOpen(true)} />
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} onDetails={setDetailsItem} onWatch={setWatchItem} />}
      {detailsItem && <DetailsModal item={detailsItem} favorite={favorites.includes(detailsItem.id)} onFavorite={toggleFavorite} onWatch={setWatchItem} onClose={() => setDetailsItem(null)} />}
      {watchItem && <PlayerModal item={watchItem} onClose={() => setWatchItem(null)} />}
      <div className={`toast ${toast ? 'visible' : ''}`}><Check size={17} />{toast}</div>
    </div>
  );
}
