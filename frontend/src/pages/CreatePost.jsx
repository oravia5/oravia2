import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Image, Video, Plus, Trash2, MapPin, Tag, Gift, Percent, Upload, Pencil, Check, ShoppingBag, Camera } from 'lucide-react';
import client from '../api/client';
import { useUpload } from '../context/UploadContext';
import CaptionInput from '../components/CaptionInput/CaptionInput';
import { getFullMediaUrl } from '../utils/mediaUrl';

const POPULAR_LOCATIONS = [
  'Mumbai, Maharashtra, India',
  'Delhi, NCR, India',
  'Bangalore, Karnataka, India',
  'Hyderabad, Telangana, India',
  'Ahmedabad, Gujarat, India',
  'Chennai, Tamil Nadu, India',
  'Kolkata, West Bengal, India',
  'Surat, Gujarat, India',
  'Pune, Maharashtra, India',
  'Jaipur, Rajasthan, India',
  'Lucknow, Uttar Pradesh, India',
  'Kanpur, Uttar Pradesh, India',
  'Indore, Madhya Pradesh, India',
  'Thane, Maharashtra, India',
  'Bhopal, Madhya Pradesh, India',
  'Visakhapatnam, Andhra Pradesh, India',
  'Pimpri-Chinchwad, Maharashtra, India',
  'Patna, Bihar, India',
  'Vadodara, Gujarat, India',
  'Ghaziabad, Uttar Pradesh, India',
  'Ludhiana, Punjab, India',
  'Coimbatore, Tamil Nadu, India',
  'Agra, Uttar Pradesh, India',
  'Madurai, Tamil Nadu, India',
  'Nashik, Maharashtra, India',
  'Faridabad, Haryana, India',
  'Meerut, Uttar Pradesh, India',
  'Rajkot, Gujarat, India',
  'Kalyan-Dombivli, Maharashtra, India',
  'Vasai-Virar, Maharashtra, India',
  'Varanasi, Uttar Pradesh, India',
  'Srinagar, Jammu and Kashmir, India',
  'Aurangabad, Maharashtra, India',
  'Dhanbad, Jharkhand, India',
  'Amritsar, Punjab, India',
  'Navi Mumbai, Maharashtra, India',
  'Allahabad, Uttar Pradesh, India',
  'Ranchi, Jharkhand, India',
  'Howrah, West Bengal, India',
  'Jabalpur, Madhya Pradesh, India',
  'Gwalior, Madhya Pradesh, India',
  'Vijayawada, Andhra Pradesh, India',
  'Jodhpur, Rajasthan, India',
  'Raipur, Chhattisgarh, India',
  'Kota, Rajasthan, India',
  'Guwahati, Assam, India',
  'Chandigarh, India',
  'Noida, Uttar Pradesh, India',
  'Gurgaon, Haryana, India',
  'New York City, NY, USA',
  'Los Angeles, CA, USA',
  'Chicago, IL, USA',
  'Houston, TX, USA',
  'London, United Kingdom',
  'Manchester, United Kingdom',
  'Paris, France',
  'Berlin, Germany',
  'Tokyo, Japan',
  'Singapore',
  'Dubai, United Arab Emirates',
  'Sydney, NSW, Australia',
  'Melbourne, VIC, Australia',
  'Toronto, ON, Canada',
  'Vancouver, BC, Canada'
];

const CURRENCY_LIST = [
  { code: 'INR', symbol: '₹', name: '₹ (INR - Indian Rupee)' },
  { code: 'USD', symbol: '$', name: '$ (USD - US Dollar)' },
  { code: 'EUR', symbol: '€', name: '€ (EUR - Euro)' },
  { code: 'GBP', symbol: '£', name: '£ (GBP - British Pound)' },
  { code: 'AED', symbol: 'AED ', name: 'AED (UAE Dirham)' },
  { code: 'CAD', symbol: 'CA$', name: 'CA$ (CAD - Canadian Dollar)' },
  { code: 'AUD', symbol: 'AU$', name: 'AU$ (AUD - Australian Dollar)' },
  { code: 'JPY', symbol: '¥', name: '¥ (JPY - Japanese Yen)' },
  { code: 'CNY', symbol: 'CN¥', name: 'CN¥ (CNY - Chinese Yuan)' },
  { code: 'KRW', symbol: '₩', name: '₩ (KRW - South Korean Won)' },
  { code: 'SGD', symbol: 'SG$', name: 'SG$ (SGD - Singapore Dollar)' },
  { code: 'NZD', symbol: 'NZ$', name: 'NZ$ (NZD - New Zealand Dollar)' },
  { code: 'CHF', symbol: 'CHF ', name: 'CHF (Swiss Franc)' },
  { code: 'SAR', symbol: 'SAR ', name: 'SAR (Saudi Riyal)' },
  { code: 'BRL', symbol: 'R$', name: 'R$ (BRL - Brazilian Real)' },
  { code: 'ZAR', symbol: 'R', name: 'R (ZAR - South African Rand)' },
  { code: 'TRY', symbol: '₺', name: '₺ (TRY - Turkish Lira)' },
  { code: 'PHP', symbol: '₱', name: '₱ (PHP - Philippine Peso)' },
  { code: 'THB', symbol: '฿', name: '฿ (THB - Thai Baht)' },
  { code: 'MYR', symbol: 'RM', name: 'RM (MYR - Malaysian Ringgit)' },
  { code: 'IDR', symbol: 'Rp', name: 'Rp (IDR - Indonesian Rupiah)' },
  { code: 'VND', symbol: '₫', name: '₫ (VND - Vietnamese Dong)' },
  { code: 'MXN', symbol: 'Mex$', name: 'Mex$ (MXN - Mexican Peso)' },
  { code: 'PLN', symbol: 'zł', name: 'zł (PLN - Polish Zloty)' },
  { code: 'RUB', symbol: '₽', name: '₽ (RUB - Russian Ruble)' },
];

const parseNumericPrice = (val) => {
  if (typeof val === 'number') return val;
  if (!val) return NaN;
  if (val.toString().toLowerCase() === 'free') return 0;
  const cleaned = val.toString().replace(/[^0-9.]/g, '');
  return cleaned ? parseFloat(cleaned) : NaN;
};

const calculateDiscountPercent = (priceVal, originalPriceVal) => {
  const p = parseNumericPrice(priceVal);
  const op = parseNumericPrice(originalPriceVal);
  if (!isNaN(p) && !isNaN(op) && op > p && op > 0) {
    return Math.round(((op - p) / op) * 100);
  }
  return 0;
};

export default function CreatePost() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const { startUpload, updateProgress, finishUpload } = useUpload();
  const uploadIdRef = useRef(null);

  // Check if opened in reel mode (from Snips page "Create Reel" button)
  const isReelMode = location.state?.reelMode === true;
  const editDraft = location.state?.editDraft;
  const editPost = location.state?.editPost;
  const targetItem = editDraft || editPost;

  // Main post state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState(
    targetItem 
      ? (targetItem.mediaItems && targetItem.mediaItems.length > 0 
          ? targetItem.mediaItems.map(m => m.url) 
          : (targetItem.mediaUrl ? [targetItem.mediaUrl] : [])) 
      : []
  );
  const [caption, setCaption] = useState(targetItem ? targetItem.caption : '');
  const [locationName, setLocationName] = useState(targetItem ? targetItem.location : '');
  const [isReel, setIsReel] = useState(targetItem ? targetItem.type === 'reel' : isReelMode);
  const [isNSFW, setIsNSFW] = useState(targetItem ? Boolean(targetItem.isNSFW) : false);
  const [captureSource, setCaptureSource] = useState('gallery'); // 'gallery' or 'camera'
  
  // Products state (list of affiliate products)
  const [products, setProducts] = useState(
    targetItem && targetItem.products
      ? targetItem.products.map(p => ({
          ...p,
          currency: p.currency || (p.price?.startsWith('$') ? '$' : (p.price?.startsWith('€') ? '€' : (p.price?.startsWith('£') ? '£' : '₹'))),
          price: p.price ? (p.price === 'FREE' ? '0' : p.price.replace(/[^0-9.]/g, '')) : '',
          originalPrice: p.originalPrice ? p.originalPrice.replace(/[^0-9.]/g, '') : '',
          isFree: p.price === 'FREE' || p.price === '0',
          saved: true
        }))
      : []
  );
  const [productErrors, setProductErrors] = useState({});
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [showLocSuggestions, setShowLocSuggestions] = useState(false);
  const [dbLocations, setDbLocations] = useState([]);

  const handleLocationInputChange = async (val) => {
    setLocationName(val);
    setShowLocSuggestions(true);
    if (!val.trim()) {
      setDbLocations([]);
      return;
    }
    try {
      const res = await client.get(`/locations?q=${encodeURIComponent(val)}`);
      if (res.data.success) {
        setDbLocations(res.data.data);
      }
    } catch (err) {
      console.error('Error searching locations:', err);
    }
  };

  const handleLocationFocus = async () => {
    setShowLocSuggestions(true);
    if (locationName.trim()) {
      try {
        const res = await client.get(`/locations?q=${encodeURIComponent(locationName)}`);
        if (res.data.success) {
          setDbLocations(res.data.data);
        }
      } catch (err) {
        console.error('Error searching locations:', err);
      }
    }
  };



  const checkIsVideo = (url, idx) => {
    if (isReel) return true;
    if (url.startsWith('blob:')) {
      const file = selectedFiles[idx];
      if (file) {
        if (file.type && (file.type.startsWith('video/') || file.type.includes('video'))) return true;
        const name = (file.name || '').toLowerCase();
        if (['.mp4', '.mov', '.3gp', '.webm', '.mkv', '.avi', '.m4v', '.ts'].some(ext => name.endsWith(ext))) {
          return true;
        }
      }
      return false;
    }
    const lower = url.toLowerCase();
    if (['.mp4', '.mov', '.3gp', '.webm', '.mkv', '.avi', '.m4v', '.ts'].some(ext => lower.endsWith(ext))) {
      return true;
    }
    if (targetItem) {
      if (targetItem.type === 'video' || targetItem.type === 'reel') {
        return true;
      }
      if (targetItem.mediaItems && targetItem.mediaItems[idx]) {
        return targetItem.mediaItems[idx].type === 'video';
      }
    }
    return false;
  };

  // Album state variables
  const [existingAlbums, setExistingAlbums] = useState([]);
  const [selectedAlbumVal, setSelectedAlbumVal] = useState(targetItem && targetItem.album ? targetItem.album : '');
  const [newAlbumName, setNewAlbumName] = useState('');

  useEffect(() => {
    const fetchExistingAlbums = async () => {
      try {
        const currentUserStr = localStorage.getItem('oravia_user');
        if (currentUserStr) {
          const currentUserObj = JSON.parse(currentUserStr);
          const res = await client.get(`/posts?author=${currentUserObj._id}`);
          if (res.data.success) {
            const albums = [];
            res.data.data.forEach(post => {
              if (post.album && !albums.includes(post.album)) {
                albums.push(post.album);
              }
            });
            setExistingAlbums(albums);
          }
        }
      } catch (err) {
        console.error('Error loading existing user albums:', err);
      }
    };
    fetchExistingAlbums();
  }, []);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      if (captureSource === 'camera') {
        const file = files[0];
        if (file) {
          if (isReel) {
            const isVid = (file.type && file.type.startsWith('video/')) || 
              ['.mp4', '.mov', '.3gp', '.webm', '.mkv', '.avi'].some(ext => (file.name || '').toLowerCase().endsWith(ext));
            if (!isVid && file.type && file.type.startsWith('image/')) {
              setError('Snips require a video recording. Please record or select a video.');
              if (e.target) e.target.value = '';
              return;
            }
          }
          setSelectedFiles([file]);
          setPreviewUrls([URL.createObjectURL(file)]);
          setError('');
        }
        if (e.target) e.target.value = '';
        return;
      }

      if (isReel) {
        const videoFile = files.find(f => 
          (f.type && f.type.startsWith('video/')) || 
          ['.mp4', '.mov', '.3gp', '.webm', '.mkv', '.avi'].some(ext => (f.name || '').toLowerCase().endsWith(ext))
        );
        if (videoFile) {
          setSelectedFiles([videoFile]);
          setPreviewUrls([URL.createObjectURL(videoFile)]);
          setError('');
        } else {
          setError('Please select a video file for Snips.');
        }
        if (e.target) e.target.value = '';
        return;
      }

      if (selectedFiles.length + files.length > 10) {
        setError('You can upload a maximum of 10 media files.');
        if (e.target) e.target.value = '';
        return;
      }

      const newPreviews = files.map(file => URL.createObjectURL(file));
      setSelectedFiles(prev => [...prev, ...files]);
      setPreviewUrls(prev => [...prev, ...newPreviews]);
      setError('');
    }
    if (e.target) e.target.value = '';
  };

  const handleRemoveFile = (indexToRemove) => {
    setSelectedFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
    setPreviewUrls(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Add a new empty product card
  const handleAddProduct = () => {
    setProducts([
      ...products,
      {
        currency: '₹',
        type: '',
        title: '',
        link: '',
        price: '',
        originalPrice: '',
        isFree: false,
        imageFile: null,
        previewUrl: '',
        digitalFile: null,
        digitalFileName: '',
        saved: false,
      }
    ]);
  };

  // Remove an affiliate product card
  const handleRemoveProduct = (idx) => {
    const updated = [...products];
    updated.splice(idx, 1);
    setProducts(updated);
  };

  // Switch product type and clear fields that don't belong to the new type
  const handleProductTypeChange = (idx, newType) => {
    const updated = [...products];
    const prod = { ...updated[idx] };
    if (newType === 'affiliate') {
      prod.digitalFile = null;
      prod.digitalFileName = '';
    } else if (newType === 'downloadable') {
      prod.link = '';
      prod.price = '';
      prod.originalPrice = '';
    }
    prod.type = newType;
    updated[idx] = prod;
    setProducts(updated);
  };

  // Handle changes in product text inputs
  const handleProductInputChange = (idx, field, value) => {
    const updated = [...products];
    updated[idx][field] = value;
    setProducts(updated);
  };

  // Handle product image selection
  const handleProductImageChange = (idx, e) => {
    const file = e.target.files[0];
    if (file) {
      const updated = [...products];
      updated[idx].imageFile = file;
      updated[idx].previewUrl = URL.createObjectURL(file);
      setProducts(updated);
    }
  };

  // Handle product digital file selection
  const handleProductFileChange = (idx, e) => {
    const file = e.target.files[0];
    if (file) {
      const updated = [...products];
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      const ext = file.name.split('.').pop().toUpperCase();
      updated[idx].digitalFile = file;
      updated[idx].digitalFileName = file.name;
      updated[idx].fileSize = `${mb} MB`;
      updated[idx].fileType = ext;
      setProducts(updated);
    }
  };

  const handleRemoveProductFile = (idx) => {
    const updated = [...products];
    updated[idx].digitalFile = null;
    updated[idx].digitalFileName = '';
    updated[idx].fileSize = '';
    updated[idx].fileType = '';
    setProducts(updated);
  };

  // Validate a single product card — returns an object of field errors (empty = valid)
  const validateProduct = (prod) => {
    const errs = {};
    if (!prod.type) errs.type = 'Pick a product type';
    if (!prod.title || !prod.title.trim()) errs.title = 'Product name is required';
    if (prod.type === 'affiliate') {
      const numP = prod.isFree ? 0 : parseNumericPrice(prod.price);
      if (!prod.isFree && prod.price && prod.price.toString().trim()) {
        if (isNaN(numP) || numP < 0) {
          errs.price = 'Enter a valid numeric price';
        }
      }

      if (prod.originalPrice && prod.originalPrice.toString().trim()) {
        const numOp = parseNumericPrice(prod.originalPrice);
        if (isNaN(numOp) || numOp < 0) {
          errs.originalPrice = 'Enter a valid numeric MRP';
        } else if (!isNaN(numP) && numOp < numP) {
          errs.originalPrice = 'Original MRP must be ≥ Sale Price';
        }
      }

      if (!prod.link || !prod.link.trim()) {
        errs.link = 'Affiliate link is required';
      } else if (!prod.link.startsWith('http://') && !prod.link.startsWith('https://')) {
        errs.link = 'Must start with http:// or https://';
      }
    }
    if (prod.type === 'downloadable') {
      const hasFile = !!prod.digitalFile || !!prod.fileUrl || !!prod.digitalFileName;
      if (!hasFile) errs.file = 'Attach a file to continue';
    }
    return errs;
  };

  // Save/confirm a single product card (collapse it)
  const handleSaveProduct = (idx) => {
    const errs = validateProduct(products[idx]);
    setProductErrors((prev) => ({ ...prev, [idx]: errs }));
    if (Object.keys(errs).length > 0) return;
    const updated = [...products];
    updated[idx] = { ...updated[idx], saved: true };
    setProducts(updated);
  };

  // Re-expand a saved product card for editing
  const handleEditProduct = (idx) => {
    const updated = [...products];
    updated[idx] = { ...updated[idx], saved: false };
    setProducts(updated);
    setProductErrors((prev) => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
  };

  const handlePublish = async (e, statusVal = 'published') => {
    if (e && e.preventDefault) e.preventDefault();

    if (!targetItem && selectedFiles.length === 0) {
      setError('Please select at least one photo or video file to share');
      return;
    }

    // Auto-validate any unsaved products and block submission if invalid
    let hasUnsavedInvalid = false;
    const newErrors = {};
    for (let i = 0; i < products.length; i++) {
      if (!products[i].saved) {
        const errs = validateProduct(products[i]);
        newErrors[i] = errs;
        if (Object.keys(errs).length > 0) {
          hasUnsavedInvalid = true;
        }
      }
    }
    if (hasUnsavedInvalid) {
      setProductErrors((prev) => ({ ...prev, ...newErrors }));
      setError('Please save all product cards before publishing, or fix the errors shown.');
      return;
    }
    // Also validate already-saved products one more time (defensive)
    for (let i = 0; i < products.length; i++) {
      const errs = validateProduct(products[i]);
      if (Object.keys(errs).length > 0) {
        setError(`Product #${i + 1} has invalid data. Click Edit to fix it.`);
        return;
      }
    }

    // Validate album name if creating new
    if (selectedAlbumVal === '__new__' && !newAlbumName.trim()) {
      setError('Please enter a name for the new album');
      return;
    }

    setUploading(true);
    setError('');

    const finalAlbum = selectedAlbumVal === '__new__' ? newAlbumName.trim() : selectedAlbumVal.trim();

    // IF EDITING A PUBLISHED POST OR DRAFT (without changing post media files)
    if (targetItem && selectedFiles.length === 0) {
      try {
        const formData = new FormData();
        formData.append('caption', caption);
        formData.append('location', locationName);
        formData.append('album', finalAlbum);
        formData.append('status', statusVal);
        formData.append('isNSFW', isNSFW ? 'true' : 'false');

        const productsData = products.map((prod) => {
          if (prod.imageFile) {
            formData.append('productImages', prod.imageFile);
          }
          if (prod.digitalFile) {
            formData.append('productFiles', prod.digitalFile);
          }
          const curr = prod.currency || '₹';
          const numP = prod.isFree ? 0 : parseNumericPrice(prod.price);
          const numOp = parseNumericPrice(prod.originalPrice);

          const formattedPrice = prod.isFree ? 'FREE' : (!isNaN(numP) ? `${curr}${numP}` : (prod.price || '').trim());
          const formattedOriginalPrice = (!isNaN(numOp) && numOp > (isNaN(numP) ? 0 : numP)) ? `${curr}${numOp}` : '';

          const obj = {
            type: prod.type,
            title: prod.title.trim(),
            currency: curr,
            hasImageFile: !!prod.imageFile,
            imageUrl: prod.imageUrl || '',
          };
          if (prod.type === 'affiliate') {
            obj.link = prod.link.trim();
            obj.price = formattedPrice;
            obj.originalPrice = formattedOriginalPrice;
          } else if (prod.type === 'downloadable') {
            obj.hasDigitalFile = !!prod.digitalFile;
            obj.fileUrl = prod.fileUrl || '';
            obj.fileName = prod.fileName || '';
            obj.fileSize = prod.fileSize || '';
            obj.fileType = prod.fileType || '';
            obj.requireFollow = !!prod.requireFollow;
          }
          return obj;
        });

        formData.append('products', JSON.stringify(productsData));

        const targetId = editPost ? editPost._id : editDraft._id;
        const res = await client.put(`/posts/${targetId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (res.data.success) {
          navigate(isReel ? '/snips' : '/');
        }
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || 'Failed to update post.');
      } finally {
        setUploading(false);
      }
      return;
    }

    // NORMAL POST CREATION (or draft update that replaced media files):
    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append('media', file);
    });
    formData.append('caption', caption);
    formData.append('location', locationName);
    
    // Explicitly determine type based on first media item
    const isVideo = selectedFiles[0] && selectedFiles[0].type.startsWith('video/');
    const type = isReel ? 'reel' : (isVideo ? 'video' : 'photo');
    formData.append('type', type);
    formData.append('status', statusVal);
    formData.append('isReal', captureSource === 'camera' ? 'true' : 'false');
    formData.append('isNSFW', isNSFW ? 'true' : 'false');

    if (finalAlbum) {
      formData.append('album', finalAlbum);
    }

    // Structure product data
    const productsData = products.map((prod) => {
      if (prod.imageFile) {
        formData.append('productImages', prod.imageFile);
      }
      if (prod.digitalFile) {
        formData.append('productFiles', prod.digitalFile);
      }
      const curr = prod.currency || '₹';
      const numP = prod.isFree ? 0 : parseNumericPrice(prod.price);
      const numOp = parseNumericPrice(prod.originalPrice);

      const formattedPrice = prod.isFree ? 'FREE' : (!isNaN(numP) ? `${curr}${numP}` : (prod.price || '').trim());
      const formattedOriginalPrice = (!isNaN(numOp) && numOp > (isNaN(numP) ? 0 : numP)) ? `${curr}${numOp}` : '';

      const obj = {
        type: prod.type,
        title: prod.title.trim(),
        currency: curr,
        hasImageFile: !!prod.imageFile,
        imageUrl: prod.imageUrl || '',
      };
      if (prod.type === 'affiliate') {
        obj.link = prod.link.trim();
        obj.price = formattedPrice;
        obj.originalPrice = formattedOriginalPrice;
      } else if (prod.type === 'downloadable') {
        obj.hasDigitalFile = !!prod.digitalFile;
        obj.fileUrl = prod.fileUrl || '';
        obj.fileName = prod.fileName || '';
        obj.fileSize = prod.fileSize || '';
        obj.fileType = prod.fileType || '';
        obj.requireFollow = !!prod.requireFollow;
      }
      return obj;
    });

    formData.append('products', JSON.stringify(productsData));

    // Endpoint: Reels go to '/reels', regular posts go to '/posts'
    const endpoint = isReel ? '/reels' : '/posts';

    try {
      // If we are replacing files of a draft, delete the old draft post
      if (editDraft) {
        await client.delete(`/posts/${editDraft._id}`);
      }

      const uploadId = Date.now().toString();
      uploadIdRef.current = uploadId;
      const filename = selectedFiles[0]?.name || 'Post';
      startUpload(uploadId, filename);

      const res = await client.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000,
        onUploadProgress: (progressEvent) => {
          const pct = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setUploadProgress(pct);
          updateProgress(uploadId, pct);
        },
      });

      finishUpload(uploadId, true);
      uploadIdRef.current = null;

      if (res.data.success) {
        navigate(isReel ? '/snips' : '/');
      }
    } catch (err) {
      console.error(err);
      if (uploadIdRef.current) {
        finishUpload(uploadIdRef.current, false);
        uploadIdRef.current = null;
      }
      setError(err.response?.data?.message || 'Failed to share post. Ensure media format and size are correct.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="create-page-container">
      {/* Header Bar */}
      <header className="create-header-bar">
        <button className="back-arrow-btn" onClick={() => navigate(-1)} disabled={uploading}>
          <ArrowLeft size={20} />
        </button>
        <h3>{isReel ? 'Create Snip' : 'Create Post'}</h3>
        <button 
          className="publish-header-btn" 
          onClick={handlePublish} 
          disabled={uploading || (selectedFiles.length === 0 && !targetItem)}
        >
          Share
        </button>
      </header>

      {/* Upload Progress Bar */}
      {uploading && (
        <div className="upload-progress-container">
          <div className="upload-progress-bar" style={{ width: `${uploadProgress}%` }} />
          <span className="upload-progress-text">{uploadProgress}%</span>
        </div>
      )}

      {!isReelMode && !targetItem && (
        <div className="create-type-tabs">
          <button 
            type="button" 
            className={`type-tab-btn ${!isReel ? 'active' : ''}`}
            onClick={() => {
              setIsReel(false);
              setSelectedFiles([]);
              setPreviewUrls([]);
              setError('');
            }}
            disabled={uploading}
          >
            Standard Post
          </button>
          <button 
            type="button" 
            className={`type-tab-btn ${isReel ? 'active' : ''}`}
            onClick={() => {
              setIsReel(true);
              setSelectedFiles([]);
              setPreviewUrls([]);
              setError('');
            }}
            disabled={uploading}
          >
            Snip (Reel)
          </button>
        </div>
      )}

      {!targetItem && (
        <div className="capture-source-selector">
          <button
            type="button"
            className={`source-tab-btn ${captureSource === 'gallery' ? 'active' : ''}`}
            onClick={() => {
              setCaptureSource('gallery');
              setSelectedFiles([]);
              setPreviewUrls([]);
              setError('');
            }}
            disabled={uploading}
          >
            Choose from Gallery
          </button>
          <button
            type="button"
            className={`source-tab-btn ${captureSource === 'camera' ? 'active' : ''}`}
            onClick={() => {
              setCaptureSource('camera');
              setSelectedFiles([]);
              setPreviewUrls([]);
              setError('');
              setTimeout(() => {
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                  fileInputRef.current.click();
                }
              }, 50);
            }}
            disabled={uploading}
          >
            Capture Live Camera
          </button>
        </div>
      )}

      <form onSubmit={handlePublish} className="create-post-form">
        {error && <div className="create-alert-banner error">{error}</div>}

        {/* Media Selector Box */}
        <div className="media-selector-area">
          {previewUrls.length > 0 ? (
            <div className="multi-preview-container">
              {previewUrls.map((url, idx) => {
                const isVideo = checkIsVideo(url, idx);
                return (
                  <div key={idx} className="preview-card-item">
                    {isVideo ? (
                      <video src={getFullMediaUrl(url)} className="preview-card-media" muted />
                    ) : (
                      <img src={getFullMediaUrl(url)} alt="" className="preview-card-media" />
                    )}
                    {!editPost && (
                      <button
                        type="button"
                        className="remove-preview-btn"
                        onClick={() => handleRemoveFile(idx)}
                        disabled={uploading}
                      >
                        &times;
                      </button>
                    )}
                  </div>
                );
              })}
              {!editPost && previewUrls.length < (captureSource === 'camera' ? 1 : 10) && (
                <div className="add-more-media-card" onClick={() => { if (fileInputRef.current) { fileInputRef.current.value = ''; fileInputRef.current.click(); } }}>
                  <Plus size={24} />
                  <span>Add More</span>
                </div>
              )}
            </div>
          ) : (
            <div className="media-upload-placeholder" onClick={() => { if (fileInputRef.current) { fileInputRef.current.value = ''; fileInputRef.current.click(); } }}>
              <div className="placeholder-icons">
                {isReel ? <Video size={28} /> : captureSource === 'camera' ? <Camera size={28} /> : <><Image size={28} /><Video size={28} /></>}
              </div>
              <h5>{isReel ? (captureSource === 'camera' ? 'Record a Snip' : 'Add a Video') : (captureSource === 'camera' ? 'Take a Photo' : 'Add Photos or Videos')}</h5>
              <p>{isReel ? (captureSource === 'camera' ? 'Tap to open camera and record live video' : 'Select a video file for your Snip') : (captureSource === 'camera' ? 'Tap to open camera and snap a photo' : 'Select up to 10 files (supports mixed images & videos)')}</p>
            </div>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept={
              captureSource === 'camera' 
                ? (isReel ? "video/*" : "image/*") 
                : (isReel ? "video/*" : "image/*,video/*")
            } 
            capture={captureSource === 'camera' ? "environment" : undefined}
            multiple={captureSource === 'camera' ? false : !isReel}
            style={{ display: 'none' }}
          />
        </div>

        {/* Main Details */}
        <div className="form-section-card">
          <div className="input-group">
            <label>Caption</label>
            <CaptionInput
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              disabled={uploading}
            />
          </div>

          <div className="input-group" style={{ position: 'relative' }}>
            <label>Location</label>
            <div className="input-with-icon">
              <MapPin size={18} className="input-icon" />
              <input
                type="text"
                placeholder="Add location (optional)"
                value={locationName}
                onChange={(e) => handleLocationInputChange(e.target.value)}
                onFocus={handleLocationFocus}
                onBlur={() => setTimeout(() => setShowLocSuggestions(false), 200)}
                className="create-text-input"
                disabled={uploading}
              />
            </div>
            {showLocSuggestions && locationName.trim().length > 0 && (
              <div className="location-suggestions-dropdown" style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#121214',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                maxHeight: '150px',
                overflowY: 'auto',
                zIndex: 9999,
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
              }}>
                {(dbLocations.length > 0 ? dbLocations.map(l => l.name) : POPULAR_LOCATIONS.filter(loc => loc.toLowerCase().includes(locationName.toLowerCase()))).map((loc, idx) => (
                  <div
                    key={idx}
                    onClick={() => { setLocationName(loc); setShowLocSuggestions(false); }}
                    style={{ padding: '10px 14px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid rgba(255, 255, 255, 0.03)', color: '#fff', textAlign: 'left' }}
                  >
                    {loc}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="input-group">
            <label>Add to Album</label>
            <select
              value={selectedAlbumVal}
              onChange={(e) => setSelectedAlbumVal(e.target.value)}
              className="create-select-field"
              disabled={uploading}
            >
              <option value="">No Album (Standalone Post)</option>
              {existingAlbums.map((albumName, index) => (
                <option key={index} value={albumName}>
                  {albumName}
                </option>
              ))}
              <option value="__new__">+ Create New Album...</option>
            </select>
          </div>

          {selectedAlbumVal === '__new__' && (
            <div className="input-group animate-fade">
              <label>New Album Name</label>
              <input
                type="text"
                placeholder="Enter new album name (e.g. Travel 2026)"
                value={newAlbumName}
                onChange={(e) => setNewAlbumName(e.target.value)}
                className="create-album-text-input"
                required={selectedAlbumVal === '__new__'}
                disabled={uploading}
              />
            </div>
          )}

          {!isReel && !isReelMode && selectedFiles.length === 1 && selectedFiles[0].type.startsWith('video/') && (
            <div className="form-group checkbox-wrapper">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={isReel}
                  onChange={(e) => setIsReel(e.target.checked)}
                  disabled={uploading}
                />
                <span className="checkmark"></span>
                <div className="checkbox-label">
                  <span>Upload as Snip</span>
                  <small>Short vertical scrolling video</small>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Shoppable Products List */}
        <div className="form-section-card products-section">
          <div className="section-header-row">
            <h4>Products</h4>
            <button 
              type="button" 
              onClick={handleAddProduct} 
              className="add-product-btn"
              disabled={uploading}
            >
              <Plus size={16} />
              <span>Add Product</span>
            </button>
          </div>

          {products.length === 0 ? (
            <div className="empty-products-placeholder">
              <div className="placeholder-star" style={{ background: 'rgba(99,102,241,0.1)', padding: '10px', borderRadius: '50%', display: 'inline-flex', marginBottom: '8px' }}>
                <ShoppingBag size={20} color="var(--accent-indigo)" />
              </div>
              <p>Add shoppable products directly inside this post. Visitors will see clickable product sliders below your photo/video!</p>
            </div>
          ) : (
            <div className="product-inputs-list">
              {products.map((item, idx) => {
                const errs = productErrors[idx] || {};
                return (
                  <div key={idx} className={`product-input-card ${item.saved ? 'product-card-saved' : ''}`}>

                    {/* ── Collapsed Summary View ── */}
                    {item.saved ? (
                      <div className="product-card-summary">
                        <div className="summary-left">
                          <div className="summary-thumb">
                            {item.previewUrl ? (
                              <img src={item.previewUrl} alt="" />
                            ) : item.type === 'downloadable' ? (
                              <Upload size={14} />
                            ) : (
                              <ShoppingBag size={14} />
                            )}
                          </div>
                          <div className="summary-info">
                            <span className="summary-name">{item.title || 'Untitled Product'}</span>
                            <span className="summary-meta" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              {item.type === 'affiliate' ? (
                                <>
                                  <span style={{ fontWeight: '700', color: item.isFree ? '#22c55e' : 'var(--accent-indigo)' }}>
                                    {item.isFree ? 'FREE' : `${item.currency || '₹'}${item.price}`}
                                  </span>
                                  {item.originalPrice && (
                                    <span style={{ textDecoration: 'line-through', color: '#52525b', fontSize: '11px' }}>
                                      {item.currency || '₹'}{item.originalPrice}
                                    </span>
                                  )}
                                  {(() => {
                                    const disc = calculateDiscountPercent(item.isFree ? 0 : item.price, item.originalPrice);
                                    if (disc > 0) {
                                      return (
                                        <span style={{ fontSize: '9px', fontWeight: '700', color: '#22c55e', background: 'rgba(34, 197, 94, 0.12)', padding: '1px 5px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                          <Tag size={9} />
                                          <span>{disc}% OFF</span>
                                        </span>
                                      );
                                    }
                                    return null;
                                  })()}
                                </>
                              ) : (
                                'Downloadable File'
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="summary-actions">
                          <button
                            type="button"
                            onClick={() => handleEditProduct(idx)}
                            className="summary-edit-btn"
                            disabled={uploading}
                            title="Edit product"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveProduct(idx)}
                            className="delete-product-btn"
                            disabled={uploading}
                            title="Remove product"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* ── Expanded Form View ── */}
                        <div className="product-card-header">
                          <h5>Product #{idx + 1}</h5>
                          <button
                            type="button"
                            onClick={() => handleRemoveProduct(idx)}
                            className="delete-product-btn"
                            disabled={uploading}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {/* Type Selector Toggle */}
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                          <button
                            type="button"
                            onClick={() => { handleProductTypeChange(idx, 'affiliate'); setProductErrors((p) => { const n = { ...p }; if (n[idx]) { delete n[idx].type; if (Object.keys(n[idx]).length === 0) delete n[idx]; } return n; }); }}
                            style={{
                              flex: 1, padding: '8px 0', borderRadius: '8px',
                              border: item.type === 'affiliate' ? '1.5px solid var(--accent-indigo)' : '1px solid var(--border-color)',
                              background: item.type === 'affiliate' ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                              color: item.type === 'affiliate' ? 'var(--accent-indigo)' : 'var(--text-secondary)',
                              fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease',
                            }}
                            disabled={uploading}
                          >
                            Affiliate Link
                          </button>
                          <button
                            type="button"
                            onClick={() => { handleProductTypeChange(idx, 'downloadable'); setProductErrors((p) => { const n = { ...p }; if (n[idx]) { delete n[idx].type; if (Object.keys(n[idx]).length === 0) delete n[idx]; } return n; }); }}
                            style={{
                              flex: 1, padding: '8px 0', borderRadius: '8px',
                              border: item.type === 'downloadable' ? '1.5px solid var(--accent-indigo)' : '1px solid var(--border-color)',
                              background: item.type === 'downloadable' ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                              color: item.type === 'downloadable' ? 'var(--accent-indigo)' : 'var(--text-secondary)',
                              fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease',
                            }}
                            disabled={uploading}
                          >
                            Downloadable File
                          </button>
                        </div>
                        {errs.type && <p className="prod-field-error">{errs.type}</p>}

                        <div className="product-card-fields">
                          {/* Left: Product Image File Picker */}
                          <div className="product-img-selector" onClick={() => document.getElementById(`prod-img-${idx}`).click()}>
                            {item.previewUrl ? (
                              <img src={item.previewUrl} alt="Product preview" className="prod-picker-preview" />
                            ) : (
                              <div className="prod-picker-placeholder">
                                <Plus size={16} />
                                <span>Image</span>
                              </div>
                            )}
                            <input
                              type="file"
                              id={`prod-img-${idx}`}
                              onChange={(e) => handleProductImageChange(idx, e)}
                              accept="image/*"
                              style={{ display: 'none' }}
                              disabled={uploading}
                            />
                          </div>

                          {/* Right: Text Fields */}
                          <div className="product-text-fields">
                            <input
                              type="text"
                              placeholder="Product Name"
                              value={item.title}
                              onChange={(e) => { handleProductInputChange(idx, 'title', e.target.value); if (errs.title) setProductErrors((p) => { const n = { ...p }; if (n[idx]) { delete n[idx].title; if (Object.keys(n[idx]).length === 0) delete n[idx]; } return n; }); }}
                              className={`prod-text-input ${errs.title ? 'prod-input-error' : ''}`}
                              disabled={uploading}
                            />
                            {errs.title && <p className="prod-field-error">{errs.title}</p>}

                            {item.type === 'affiliate' && (
                              <>
                                {/* Currency Selector & Quick FREE Toggle Bar */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', marginBottom: '4px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: '600', color: '#a1a1aa' }}>Currency:</label>
                                    <select
                                      value={item.currency || '₹'}
                                      onChange={(e) => handleProductInputChange(idx, 'currency', e.target.value)}
                                      style={{
                                        background: '#0d0d0d',
                                        color: '#ffffff',
                                        border: '1px solid #3f3f46',
                                        borderRadius: '6px',
                                        padding: '2px 8px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        maxWidth: '180px'
                                      }}
                                      disabled={uploading}
                                    >
                                      {CURRENCY_LIST.map((curr) => (
                                        <option key={curr.code} value={curr.symbol}>
                                          {curr.name} ({curr.symbol})
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextFree = !item.isFree;
                                      const updated = [...products];
                                      updated[idx].isFree = nextFree;
                                      if (nextFree) {
                                        updated[idx].price = '0';
                                      }
                                      setProducts(updated);
                                      if (errs.price) {
                                        setProductErrors((p) => {
                                          const n = { ...p };
                                          if (n[idx]) { delete n[idx].price; if (Object.keys(n[idx]).length === 0) delete n[idx]; }
                                          return n;
                                        });
                                      }
                                    }}
                                    style={{
                                      background: item.isFree ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                      border: item.isFree ? '1px solid #22c55e' : '1px solid rgba(255, 255, 255, 0.1)',
                                      color: item.isFree ? '#22c55e' : '#a1a1aa',
                                      padding: '3px 10px',
                                      borderRadius: '12px',
                                      fontSize: '11px',
                                      fontWeight: '700',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                    disabled={uploading}
                                  >
                                    <Gift size={13} />
                                    <span>{item.isFree ? 'FREE Item' : 'Mark as FREE'}</span>
                                  </button>
                                </div>

                                <div className="product-row-inputs" style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                                  {/* Sale Price Input */}
                                  <div style={{ flex: 1, position: 'relative' }}>
                                    <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#a1a1aa', marginBottom: '3px' }}>
                                      SALE PRICE ({item.currency || '₹'}) <span style={{ fontSize: '9px', fontWeight: '400', color: '#71717a' }}>(Optional)</span>
                                    </label>
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                      <span style={{ position: 'absolute', left: '10px', color: item.isFree ? '#22c55e' : 'var(--accent-indigo)', fontWeight: '700', fontSize: '13px' }}>
                                        {item.isFree ? 'FREE' : (item.currency || '₹')}
                                      </span>
                                      <input
                                        type="text"
                                        placeholder={item.isFree ? "0" : "e.g. 799"}
                                        value={item.isFree ? '0' : item.price}
                                        disabled={item.isFree || uploading}
                                        onChange={(e) => {
                                          handleProductInputChange(idx, 'price', e.target.value);
                                          if (errs.price) {
                                            setProductErrors((p) => {
                                              const n = { ...p };
                                              if (n[idx]) { delete n[idx].price; if (Object.keys(n[idx]).length === 0) delete n[idx]; }
                                              return n;
                                            });
                                          }
                                        }}
                                        className={`prod-text-input price-field ${errs.price ? 'prod-input-error' : ''}`}
                                        style={{ paddingLeft: item.isFree ? '50px' : '28px' }}
                                      />
                                    </div>
                                    {errs.price && <p className="prod-field-error" style={{ fontSize: '10px', color: '#ef4444', margin: '2px 0 0' }}>{errs.price}</p>}
                                  </div>

                                  {/* Original MRP Input */}
                                  <div style={{ flex: 1, position: 'relative' }}>
                                    <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#a1a1aa', marginBottom: '3px' }}>
                                      ORIGINAL MRP <span style={{ fontSize: '9px', fontWeight: '400', color: '#71717a' }}>(Strikethrough)</span>
                                    </label>
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                      <span style={{ position: 'absolute', left: '10px', color: '#71717a', fontWeight: '700', fontSize: '13px' }}>
                                        {item.currency || '₹'}
                                      </span>
                                      <input
                                        type="text"
                                        placeholder="e.g. 999"
                                        value={item.originalPrice || ''}
                                        onChange={(e) => {
                                          handleProductInputChange(idx, 'originalPrice', e.target.value);
                                          if (errs.originalPrice) {
                                            setProductErrors((p) => {
                                              const n = { ...p };
                                              if (n[idx]) { delete n[idx].originalPrice; if (Object.keys(n[idx]).length === 0) delete n[idx]; }
                                              return n;
                                            });
                                          }
                                        }}
                                        className={`prod-text-input original-price-field ${errs.originalPrice ? 'prod-input-error' : ''}`}
                                        style={{ paddingLeft: '28px' }}
                                        disabled={uploading}
                                      />
                                    </div>
                                    {errs.originalPrice && <p className="prod-field-error" style={{ fontSize: '10px', color: '#ef4444', margin: '2px 0 0' }}>{errs.originalPrice}</p>}
                                  </div>
                                </div>

                                {/* Real-time Discount Badge */}
                                {(() => {
                                  const disc = calculateDiscountPercent(item.isFree ? 0 : item.price, item.originalPrice);
                                  if (disc > 0) {
                                    return (
                                      <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{
                                          fontSize: '11px',
                                          fontWeight: '700',
                                          color: '#22c55e',
                                          background: 'rgba(34, 197, 94, 0.12)',
                                          border: '1px solid rgba(34, 197, 94, 0.25)',
                                          padding: '2px 8px',
                                          borderRadius: '12px',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px'
                                        }}>
                                          <Tag size={12} />
                                          <span>{disc}% DISCOUNT APPLIED</span>
                                        </span>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}

                                <input
                                  type="url"
                                  placeholder="Affiliate link (https://...)"
                                  value={item.link}
                                  onChange={(e) => { handleProductInputChange(idx, 'link', e.target.value); if (errs.link) setProductErrors((p) => { const n = { ...p }; if (n[idx]) { delete n[idx].link; if (Object.keys(n[idx]).length === 0) delete n[idx]; } return n; }); }}
                                  className={`prod-text-input ${errs.link ? 'prod-input-error' : ''}`}
                                  style={{ marginTop: '8px' }}
                                  disabled={uploading}
                                />
                                {errs.link && <p className="prod-field-error">{errs.link}</p>}
                              </>
                            )}

                            {item.type === 'downloadable' && (
                              <>
                                <div className="digital-file-upload-row" style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                  <button
                                    type="button"
                                    onClick={() => document.getElementById(`prod-file-${idx}`).click()}
                                    style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    disabled={uploading}
                                  >
                                    <Upload size={14} />
                                    <span>{item.digitalFileName ? `File: ${item.digitalFileName}` : 'Attach PDF/Zip File'}</span>
                                  </button>
                                  <input
                                    type="file"
                                    id={`prod-file-${idx}`}
                                    onChange={(e) => { handleProductFileChange(idx, e); if (errs.file) setProductErrors((p) => { const n = { ...p }; if (n[idx]) { delete n[idx].file; if (Object.keys(n[idx]).length === 0) delete n[idx]; } return n; }); }}
                                    style={{ display: 'none' }}
                                    disabled={uploading}
                                  />
                                  {item.digitalFileName && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveProductFile(idx)}
                                      style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '11px', cursor: 'pointer' }}
                                      disabled={uploading}
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>
                                {errs.file && <p className="prod-field-error" style={{ marginTop: '4px' }}>{errs.file}</p>}

                                {(item.fileType || item.fileSize) && (
                                  <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--accent-indigo)', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', padding: '2px 8px', borderRadius: '12px' }}>
                                      {item.fileType || 'FILE'} • {item.fileSize}
                                    </span>
                                  </div>
                                )}

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px 12px' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#ffffff' }}>🔒 Require Follow to Download</span>
                                    <span style={{ fontSize: '10px', color: '#a1a1aa' }}>Visitors must follow you to unlock this free download</span>
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={!!item.requireFollow}
                                    onChange={(e) => handleProductInputChange(idx, 'requireFollow', e.target.checked)}
                                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-indigo)' }}
                                    disabled={uploading}
                                  />
                                </div>
                              </>
                            )}

                            {!item.type && (
                              <p style={{ margin: '8px 0 0', fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                Select a product type above to see relevant fields
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Save / Confirm Button */}
                        <button
                          type="button"
                          onClick={() => handleSaveProduct(idx)}
                          className="save-product-btn"
                          disabled={uploading}
                        >
                          <Check size={14} />
                          <span>Save Product</span>
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Submit Block */}
        <div className="submit-action-wrapper">
          {!editPost && (
            <button 
              type="button"
              className="btn-secondary draft-post-btn"
              disabled={uploading || (selectedFiles.length === 0 && !targetItem)}
              onClick={(e) => handlePublish(e, 'draft')}
            >
              Save Draft
            </button>
          )}
          <button 
            type="submit" 
            className="btn-primary publish-post-btn" 
            disabled={uploading || (selectedFiles.length === 0 && !targetItem)}
          >
            {uploading 
              ? (editPost ? 'Saving Changes...' : (isReel ? `Uploading Snip... ${uploadProgress}%` : `Sharing Post... ${uploadProgress}%`)) 
              : (editPost ? 'Save Changes' : (isReel ? 'Publish Snip' : 'Publish to Oravia'))}
          </button>
        </div>
      </form>

      <style>{`
        .create-page-container {
          min-height: 100vh;
          background-color: #000000;
          color: #ffffff;
          padding-top: 60px;
          padding-bottom: 90px;
        }

        .create-type-tabs {
          display: flex;
          background: #0f0f11;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 20px;
        }

        .capture-source-selector {
          display: flex;
          background: #0f0f11;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 20px;
          padding: 4px;
          gap: 4px;
          border-radius: 8px;
          background-color: rgba(255, 255, 255, 0.03);
          margin: 0 16px 20px 16px;
        }

        .source-tab-btn {
          flex: 1;
          background: none;
          border: none;
          color: #71717a;
          padding: 10px 0;
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border-radius: 6px;
        }

        .source-tab-btn:hover {
          color: #ffffff;
        }

        .source-tab-btn.active {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .type-tab-btn {
          flex: 1;
          background: none;
          border: none;
          color: #71717a;
          padding: 14px 0;
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          border-bottom: 2px solid transparent;
        }

        .type-tab-btn:hover {
          color: #ffffff;
        }

        .type-tab-btn.active {
          color: var(--accent-indigo);
          border-bottom-color: var(--accent-indigo);
        }

        .submit-action-wrapper {
          display: flex;
          gap: 12px;
          padding: 16px;
        }

        .draft-post-btn {
          flex: 1;
        }

        .publish-post-btn {
          flex: 1;
        }

        .create-header-bar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 60px;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          z-index: 100;
        }

        .upload-progress-container {
          position: fixed;
          top: 60px;
          left: 0;
          right: 0;
          height: 3px;
          background: #1a1a1a;
          z-index: 101;
        }

        .upload-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #6366f1, #8b5cf6);
          transition: width 0.3s ease;
          border-radius: 0 2px 2px 0;
        }

        .upload-progress-text {
          position: absolute;
          right: 12px;
          top: 6px;
          font-size: 11px;
          color: #a1a1aa;
          font-weight: 600;
        }

        .back-arrow-btn {
          background: none;
          border: none;
          color: #ffffff;
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 4px;
        }

        .create-header-bar h3 {
          font-family: 'Outfit', sans-serif;
          font-size: 18px;
          font-weight: 700;
          margin: 0;
        }

        .publish-header-btn {
          background: none;
          border: none;
          color: var(--accent-indigo);
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
        }

        .publish-header-btn:disabled {
          color: #52525b;
          cursor: not-allowed;
        }

        .create-post-form {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .create-alert-banner {
          font-size: 13px;
          padding: 12px;
          border-radius: 8px;
          background-color: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #f87171;
        }

        .media-selector-area {
          width: 100%;
          aspect-ratio: 16 / 10;
          background-color: #050505;
          border: 2px dashed #222222;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          overflow: hidden;
          position: relative;
        }

        .media-upload-placeholder {
          text-align: center;
          color: #71717a;
        }

        .placeholder-icons {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin-bottom: 12px;
        }

        .media-upload-placeholder h5 {
          color: #ffffff;
          font-size: 15px;
          margin-bottom: 4px;
        }

        .media-upload-placeholder p {
          font-size: 11px;
        }

        .media-preview-box {
          width: 100%;
          height: 100%;
          position: relative;
        }

        .preview-media {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .change-media-btn {
          position: absolute;
          bottom: 12px;
          right: 12px;
          background: rgba(0, 0, 0, 0.7);
          border: 1px solid #333333;
          color: #ffffff;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .form-section-card {
          background-color: #070707;
          border: 1px solid #1c1c1c;
          border-radius: 16px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .input-group label {
          font-size: 11px;
          font-weight: 600;
          color: #71717a;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .create-textarea {
          background-color: #0d0d0d;
          border: 1px solid #222222;
          border-radius: 12px;
          padding: 12px;
          font-size: 14px;
          color: #ffffff;
          resize: none;
          font-family: inherit;
        }

        .create-textarea:focus, .create-text-input:focus {
          outline: none;
          border-color: var(--accent-indigo);
        }

        .create-text-input {
          width: 100%;
          background-color: #0d0d0d;
          border: 1px solid #222222;
          border-radius: 12px;
          padding: 12px 14px 12px 42px;
          font-size: 14px;
          color: #ffffff;
        }

        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          color: #52525b;
        }

        .checkbox-wrapper {
          padding-top: 8px;
        }

        .section-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #1c1c1c;
          padding-bottom: 12px;
          margin-bottom: 4px;
        }

        .section-header-row h4 {
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          font-weight: 700;
          margin: 0;
        }

        .add-product-btn {
          background: #111111;
          border: 1px dashed #333333;
          color: #ffffff;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .add-product-btn:hover {
          border-color: var(--accent-indigo);
          color: var(--accent-indigo);
        }

        .empty-products-placeholder {
          text-align: center;
          padding: 30px 20px;
          color: #52525b;
        }

        .placeholder-star {
          font-size: 28px;
          margin-bottom: 8px;
        }

        .empty-products-placeholder p {
          font-size: 12px;
          line-height: 1.6;
          max-width: 280px;
          margin: 0 auto;
        }

        .product-inputs-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .product-input-card {
          background-color: #0c0c0e;
          border: 1px solid #222222;
          border-radius: 12px;
          padding: 14px;
          width: 100%;
          max-width: 100%;
          overflow: hidden;
          box-sizing: border-box;
        }

        .product-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .product-card-header h5 {
          font-size: 13px;
          font-weight: 600;
          color: #71717a;
          margin: 0;
        }

        .delete-product-btn {
          background: none;
          border: none;
          color: #52525b;
          cursor: pointer;
          padding: 4px;
          transition: color 0.2s;
        }

        .delete-product-btn:hover {
          color: #f87171;
        }

        .product-card-fields {
          display: flex;
          gap: 12px;
        }

        .product-img-selector {
          width: 70px;
          height: 70px;
          border: 1px dashed #333333;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #71717a;
          flex-shrink: 0;
          overflow: hidden;
          transition: border-color 0.2s;
        }

        .product-img-selector:hover {
          border-color: var(--accent-indigo);
          color: var(--accent-indigo);
        }

        .prod-picker-preview {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .prod-picker-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          font-size: 10px;
          gap: 4px;
        }

        .product-text-fields {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .prod-text-input {
          background-color: #060608;
          border: 1px solid #222222;
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 13px;
          color: #ffffff;
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }

        .prod-text-input:focus {
          outline: none;
          border-color: var(--accent-indigo);
        }

        .product-row-inputs {
          display: flex;
          gap: 8px;
          min-width: 0;
        }

        .product-row-inputs > .prod-text-input {
          flex: 1 1 0;
          min-width: 0;
        }

        .price-field {
          flex: 1 1 0;
        }

        .original-price-field {
          flex: 1 1 0;
        }

        .url-field {
          flex: 2 1 0;
        }

        .submit-action-wrapper {
          margin-top: 10px;
        }

        .publish-post-btn {
          width: 100%;
          padding: 14px;
          border-radius: 12px;
        }

        .create-select-field {
          width: 100%;
          background-color: #0d0d0d;
          border: 1px solid #222222;
          border-radius: 12px;
          padding: 12px;
          font-size: 14px;
          color: #ffffff;
          cursor: pointer;
        }

        .create-select-field:focus {
          outline: none;
          border-color: var(--accent-indigo);
        }

        .create-album-text-input {
          width: 100%;
          background-color: #0d0d0d;
          border: 1px solid #222222;
          border-radius: 12px;
          padding: 12px;
          font-size: 14px;
          color: #ffffff;
        }

        .create-album-text-input:focus {
          outline: none;
          border-color: var(--accent-indigo);
        }

        /* Multiple Previews Styles */
        .multi-preview-container {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          width: 100%;
          padding: 8px 4px;
          scrollbar-width: none;
        }
        .multi-preview-container::-webkit-scrollbar {
          display: none;
        }
        .preview-card-item {
          width: 100px;
          height: 100px;
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          flex-shrink: 0;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .preview-card-media {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .remove-preview-btn {
          position: absolute;
          top: 4px;
          right: 4px;
          background: rgba(0, 0, 0, 0.7);
          border: none;
          color: #ffffff;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          line-height: 1;
        }
        .add-more-media-card {
          width: 100px;
          height: 100px;
          border-radius: 12px;
          border: 2px dashed rgba(255, 255, 255, 0.15);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #a1a1aa;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          flex-shrink: 0;
        }
        .add-more-media-card:hover {
          border-color: var(--accent-indigo);
          color: #ffffff;
        }

        /* Product card: saved / collapsed state */
        .product-card-saved {
          border-color: rgba(99,102,241,0.25);
          background-color: rgba(99,102,241,0.04);
        }

        .product-card-summary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .summary-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          flex: 1;
        }

        .summary-thumb {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          overflow: hidden;
          color: var(--text-secondary);
        }

        .summary-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .summary-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .summary-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .summary-meta {
          font-size: 11px;
          color: var(--text-secondary);
        }

        .summary-actions {
          display: flex;
          align-items: center;
          gap: 2px;
          flex-shrink: 0;
        }

        .summary-edit-btn {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          transition: all 0.15s;
        }

        .summary-edit-btn:hover {
          color: var(--accent-indigo);
          background: rgba(99,102,241,0.1);
        }

        /* Save product button */
        .save-product-btn {
          margin-top: 12px;
          width: 100%;
          padding: 9px 0;
          border-radius: 8px;
          border: none;
          background: var(--accent-indigo);
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: opacity 0.15s;
        }

        .save-product-btn:hover {
          opacity: 0.88;
        }

        .save-product-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* Inline field errors */
        .prod-field-error {
          margin: 2px 0 0;
          font-size: 11px;
          color: #f87171;
          line-height: 1.3;
        }

        .prod-input-error {
          border-color: #f87171 !important;
        }

        /* Responsive: stack product inputs on narrow screens */
        @media (max-width: 480px) {
          .product-row-inputs {
            flex-wrap: wrap;
          }
          .product-row-inputs > .prod-text-input {
            flex: 1 1 calc(50% - 4px);
            min-width: 0;
          }
          .product-row-inputs > .url-field {
            flex: 1 1 100%;
          }
          .product-card-fields {
            flex-direction: column;
            align-items: stretch;
          }
          .product-img-selector {
            width: 100%;
            height: 100px;
          }
        }
      `}</style>
    </div>
  );
}
