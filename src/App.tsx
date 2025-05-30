import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Layout
import AdminLayout from './components/AdminLayout';

// Pages
import Dashboard from './pages/Dashboard';
import Books from './pages/Books';
import Chapters from './pages/Chapters';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Coins from './pages/Coins';
import CoinSettings from './pages/CoinSettings';
import Comments from './pages/Comments';
import TrafficStats from './pages/TrafficStats';
import Notifications from './pages/Notifications';
import PlatformSettings from './pages/PlatformSettings';
import WithdrawReview from './pages/WithdrawReview';
import ForumCategories from './pages/ForumCategories';
import ForumThreads from './pages/ForumThreads';
import ForumReports from './pages/ForumReports';
import ForumStats from './pages/ForumStats';
import HomepageBanners from './pages/HomepageBanners';
import GenresPage from './pages/GenresPage';
import TagsPage from './pages/TagsPage';
import ShortStoryTagsPage from './pages/ShortStoryTagsPage';

// Import Supabase
import { supabase } from './lib/supabase';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
        <Toaster position="top-center" reverseOrder={false} />
        <Routes>
          <Route path="/" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="books" element={<Books />} />
            <Route path="chapters" element={<Chapters />} />
            <Route path="reports" element={<Reports />} />
            <Route path="users" element={<Users />} />
            <Route path="coins" element={<Coins />} />
            <Route path="coin-settings" element={<CoinSettings />} />
            <Route path="comments" element={<Comments />} />
            <Route path="traffic-stats" element={<TrafficStats />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="platform-settings" element={<PlatformSettings />} />
            <Route path="withdraw-review" element={<WithdrawReview />} />
            <Route path="genres" element={<GenresPage />} />
            <Route path="tags" element={<TagsPage />} />
            <Route path="short-story-tags" element={<ShortStoryTagsPage />} />
            <Route path="forum/categories" element={<ForumCategories />} />
            <Route path="forum/threads" element={<ForumThreads />} />
            <Route path="forum/reports" element={<ForumReports />} />
            <Route path="forum/stats" element={<ForumStats />} />
            <Route path="homepage-banners" element={<HomepageBanners />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;