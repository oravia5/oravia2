import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FolderHeart, Download, ShoppingBag, Loader2 } from 'lucide-react';
import client from '../api/client';

export default function Wishlist() {
  const navigate = useNavigate();
  const [wishlistProducts, setWishlistProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const getFullMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `http://127.0.0.1:5000${url}`;
  };

  const fetchWishlist = async () => {
    setLoading(true);
    try {
      const res = await client.get('/products/wishlist');
      if (res.data.success) {
        setWishlistProducts(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching wishlist:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  return (
    <div className="settings-subpage">
      <header className="subpage-header">
        <button className="back-btn" onClick={() => navigate('/settings')} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <span className="subpage-header-title">My Wishlist</span>
        <div style={{ width: '36px' }} /> {/* Spacer */}
      </header>

      <main className="subpage-body">
        {loading ? (
          <div className="subpage-loader">
            <Loader2 className="spinner animate-spin" size={32} />
            <p>Loading wishlist products...</p>
          </div>
        ) : wishlistProducts.length === 0 ? (
          <div className="subpage-empty-state">
            <FolderHeart size={48} className="empty-icon text-muted" />
            <h3>Your Wishlist is Empty</h3>
            <p>Bookmark products in shoppable posts to save them here!</p>
          </div>
        ) : (
          <div className="wishlist-grid">
            {wishlistProducts.map((prod) => (
              <div
                key={prod._id}
                className="wishlist-card"
                onClick={() => prod.post?._id && navigate(`/post/${prod.post._id}`)}
              >
                <div className="wishlist-img-wrapper" style={{ background: '#0f0f12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {prod.imageUrl ? (
                    <img
                      src={getFullMediaUrl(prod.imageUrl)}
                      alt={prod.title}
                      className="wishlist-img"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const fallback = e.target.nextSibling;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}

                  {/* Fallback placeholder */}
                  <div
                    style={{
                      display: prod.imageUrl ? 'none' : 'flex',
                      position: prod.imageUrl ? 'absolute' : 'relative',
                      inset: prod.imageUrl ? 0 : undefined,
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'transparent',
                      width: '100%',
                      height: '100%'
                    }}
                  >
                    {prod.fileUrl ? (
                      <Download size={24} color="#71717a" style={{ opacity: 0.5 }} />
                    ) : (
                      <ShoppingBag size={24} color="#71717a" style={{ opacity: 0.5 }} />
                    )}
                  </div>

                  {prod.fileUrl && (
                    <button
                      type="button"
                      className="wishlist-download-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(getFullMediaUrl(prod.fileUrl), '_blank');
                      }}
                      title={prod.fileName || 'Download'}
                    >
                      <Download size={12} />
                      <span>Download File</span>
                    </button>
                  )}
                </div>
                <div className="wishlist-details">
                  <h4 className="wishlist-title">{prod.title}</h4>
                  <div className="wishlist-pricing">
                    <span className="wishlist-price">{prod.price}</span>
                    {prod.originalPrice && (
                      <span className="wishlist-original-price">{prod.originalPrice}</span>
                    )}
                  </div>
                </div>
                {prod.link && (
                  <button
                    type="button"
                    className="wishlist-buy-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(prod.link, '_blank');
                    }}
                  >
                    <ShoppingBag size={12} />
                    <span>Buy Now</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <style>{`
        .settings-subpage {
          min-height: 100vh;
          background-color: #000000;
          color: #ffffff;
          padding-top: 60px;
          padding-bottom: 20px;
          font-family: 'Outfit', sans-serif;
        }

        .subpage-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 60px;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          padding: 0 16px;
          z-index: 100;
          justify-content: space-between;
        }

        .back-btn {
          background: none;
          border: none;
          color: #ffffff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          border-radius: 50%;
          transition: background-color 0.2s;
        }

        .back-btn:hover {
          background-color: rgba(255, 255, 255, 0.08);
        }

        .subpage-header-title {
          font-weight: 700;
          font-size: 16px;
        }

        .subpage-body {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px 16px;
        }

        .subpage-loader {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 100px 20px;
          color: #71717a;
          gap: 15px;
        }

        .spinner {
          color: var(--accent-indigo);
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .subpage-empty-state {
          text-align: center;
          padding: 100px 20px;
          color: #71717a;
        }

        .empty-icon {
          margin-bottom: 16px;
          opacity: 0.6;
        }

        .subpage-empty-state h3 {
          font-size: 18px;
          color: #ffffff;
          margin-bottom: 8px;
          font-weight: 600;
        }

        .subpage-empty-state p {
          font-size: 14px;
          margin: 0;
        }

        .wishlist-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          width: 100%;
        }

        .wishlist-card {
          background: #18181b;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          cursor: pointer;
          transition: border-color 0.2s, transform 0.2s;
        }

        .wishlist-card:hover {
          border-color: var(--accent-indigo);
          transform: translateY(-2px);
        }

        .wishlist-img-wrapper {
          position: relative;
          width: 100%;
          height: 120px;
          border-radius: 8px;
          overflow: hidden;
        }

        .wishlist-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .wishlist-download-btn {
          position: absolute;
          bottom: 8px;
          right: 8px;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          color: #fff;
          border: none;
          padding: 5px 10px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          z-index: 5;
        }

        .wishlist-details {
          display: flex;
          flex-direction: column;
          gap: 4px;
          text-align: left;
        }

        .wishlist-title {
          font-size: 14px;
          font-weight: 600;
          color: #fff;
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .wishlist-pricing {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .wishlist-price {
          font-size: 14px;
          font-weight: 700;
          color: var(--accent-indigo);
        }

        .wishlist-original-price {
          font-size: 12px;
          text-decoration: line-through;
          color: #71717a;
        }

        .wishlist-buy-btn {
          background: var(--accent-indigo);
          color: #fff;
          border: none;
          padding: 8px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          width: 100%;
          transition: opacity 0.2s;
        }

        .wishlist-buy-btn:hover {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
}
