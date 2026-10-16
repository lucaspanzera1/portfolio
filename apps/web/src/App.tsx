import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { ScrollToTop } from './components/ScrollToTop';
import { Projects } from './components/Projects';
import { Footer } from './components/Footer';
import { RouteTracker } from './components/RouteTracker';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { AboutRedirect } from './components/AboutRedirect';
import { Admin } from './pages/Admin';
import { Tags } from './pages/Tags';
import { Articles } from './pages/Articles';
import { ArticleDetails } from './pages/ArticleDetails';
import { ArticleEditor } from './pages/ArticleEditor';
import { Privacy } from './pages/Privacy';
import { About } from './pages/About';
import { AboutEditor } from './pages/AboutEditor';
import { ProtectedRoute } from './components/ProtectedRoute';
import { NotFound } from './pages/NotFound';
import { hasDecided } from './lib/consent';

const ADMIN_PATH = import.meta.env.VITE_ADMIN_PATH;

function App() {
  const [lang, setLang] = useState<'EN' | 'PT'>('EN');
  const [cookieBannerOpen, setCookieBannerOpen] = useState(false);

  useEffect(() => {
    if (!hasDecided()) {
      const timer = setTimeout(() => {
        // Double check in case user opened it manually and decided within the minute
        if (!hasDecided()) {
          setCookieBannerOpen(true);
        }
      }, 60000);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <Router>
      <ScrollToTop />
      <RouteTracker adminPath={ADMIN_PATH} />
      <div className="min-h-[100dvh] selection:bg-neutral-200 flex flex-col">
        <Header lang={lang} setLang={setLang} />
        <main className="flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<Projects lang={lang} />} />
            <Route path="/about" element={<About lang={lang} />} />
            <Route path="/tags" element={<Tags lang={lang} />} />
            <Route path="/articles" element={<Articles lang={lang} />} />
            <Route path="/articles/:slug" element={<ArticleDetails lang={lang} />} />
            <Route path="/privacy" element={<Privacy lang={lang} />} />
            <Route
              path={ADMIN_PATH}
              element={
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route
              path={`${ADMIN_PATH}/articles/new`}
              element={
                <ProtectedRoute>
                  <ArticleEditor />
                </ProtectedRoute>
              }
            />
            <Route
              path={`${ADMIN_PATH}/articles/:slug/edit`}
              element={
                <ProtectedRoute>
                  <ArticleEditor />
                </ProtectedRoute>
              }
            />
            <Route
              path={`${ADMIN_PATH}/about/edit`}
              element={
                <ProtectedRoute>
                  <AboutEditor />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound lang={lang} />} />
          </Routes>
        </main>
        <AboutRedirect lang={lang} />
        <Footer lang={lang} onOpenCookiePreferences={() => setCookieBannerOpen(true)} />
      </div>
      <CookieConsentBanner
        lang={lang}
        open={cookieBannerOpen}
        onClose={() => setCookieBannerOpen(false)}
      />
    </Router>
  );
}

export default App;
