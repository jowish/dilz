import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { uploadDealImage, validateImageFile, deleteDealImage } from '../../lib/uploadImage';
import { traduireVille } from '../../lib/translations';
import { Button } from '../ui/Button';
import { Input, Select, Textarea } from '../ui/FormControls';
import { Modal } from '../ui/Modal';
import { SegmentedControl } from '../ui/SegmentedControl';

const CATEGORIES = ['Food', 'Tech', 'Fashion', 'Activities', 'Online'];
const MAX_IMAGES = 3;

const copy = {
  en: {
    title: 'Post a deal', subtitle: 'Share a real deal you found with the community.', signInSubtitle: 'Sign in to share real deals with the community.',
    authText: 'Voting, posting and saving are connected to your Dilz account.', signIn: 'Sign in to post', cancel: 'Cancel', back: 'Back', continue: 'Continue', publish: 'Publish deal',
    uploading: 'Uploading photos', publishing: 'Publishing', steps: ['Photos', 'Details', 'Location', 'Preview'],
    uploadTitle: 'Add deal photos *', uploadHelp: 'Add 1 to 3 clear photos or screenshots. JPEG, PNG or WebP up to 5 MB each.', addPhoto: 'Add photo', remove: 'Remove',
    dealTitle: 'Deal title', description: 'Description', price: 'Current price', oldPrice: 'Old price', optional: 'Optional', discount: 'discount', category: 'Category', startDate: 'Start date', endDate: 'End date',
    availability: 'Deal availability', storeMode: 'In-store', onlineMode: 'Online', store: 'Store name', website: 'Website or app', city: 'City', chooseCity: 'Choose city', url: 'Deal URL',
    onlineStoreHelp: 'Optional. The website can also be identified from the URL.', onlineUrlHelp: 'Required for an online-only Dilz.', storeUrlHelp: 'Optional, but recommended for trust.',
    previewStore: 'Store', previewCity: 'City', previewTitle: 'Deal title', previewDescription: 'A short helpful description will appear here.',
    errors: {
      images: 'Add at least one clear deal photo.', title: 'Enter a deal title.', price: 'Enter the current price.', store: 'Enter the store name.', city: 'Choose a city.', url: 'Enter the online deal URL.', dates: 'The end date must be after the start date.', form: 'Complete the required fields highlighted below.', auth: 'Please sign in to post a deal.', session: 'Session expired. Please sign in again.', failed: 'Failed to post deal', network: 'Network error. Please try again.', maxImages: 'You can add up to 3 photos.',
    },
  },
  he: {
    title: 'פרסום דיל', subtitle: 'שתפו דיל אמיתי שמצאתם עם הקהילה.', signInSubtitle: 'התחברו כדי לשתף דילים אמיתיים עם הקהילה.',
    authText: 'הצבעה, פרסום ושמירה מחוברים לחשבון Dilz שלכם.', signIn: 'התחברות לפרסום', cancel: 'ביטול', back: 'חזרה', continue: 'המשך', publish: 'פרסום הדיל',
    uploading: 'מעלה תמונות', publishing: 'מפרסם', steps: ['תמונות', 'פרטים', 'מיקום', 'תצוגה מקדימה'],
    uploadTitle: 'הוספת תמונות לדיל *', uploadHelp: 'הוסיפו 1 עד 3 תמונות או צילומי מסך ברורים. JPEG, PNG או WebP עד 5MB לתמונה.', addPhoto: 'הוספת תמונה', remove: 'הסרה',
    dealTitle: 'כותרת הדיל', description: 'תיאור', price: 'מחיר נוכחי', oldPrice: 'מחיר קודם', optional: 'לא חובה', discount: 'הנחה', category: 'קטגוריה', startDate: 'תאריך התחלה', endDate: 'תאריך סיום',
    availability: 'זמינות הדיל', storeMode: 'בחנות', onlineMode: 'אונליין', store: 'שם החנות', website: 'אתר או אפליקציה', city: 'עיר', chooseCity: 'בחרו עיר', url: 'קישור לדיל',
    onlineStoreHelp: 'לא חובה. ניתן לזהות את האתר גם מהקישור.', onlineUrlHelp: 'חובה עבור דיל אונליין.', storeUrlHelp: 'לא חובה, אך מומלץ לאמינות.',
    previewStore: 'חנות', previewCity: 'עיר', previewTitle: 'כותרת הדיל', previewDescription: 'תיאור קצר ומועיל יופיע כאן.',
    errors: {
      images: 'הוסיפו לפחות תמונה ברורה אחת.', title: 'הזינו כותרת לדיל.', price: 'הזינו את המחיר הנוכחי.', store: 'הזינו את שם החנות.', city: 'בחרו עיר.', url: 'הזינו קישור לדיל אונליין.', dates: 'תאריך הסיום חייב להיות אחרי תאריך ההתחלה.', form: 'השלימו את שדות החובה המסומנים.', auth: 'יש להתחבר כדי לפרסם דיל.', session: 'פג תוקף החיבור. התחברו שוב.', failed: 'פרסום הדיל נכשל', network: 'שגיאת רשת. נסו שוב.', maxImages: 'ניתן להוסיף עד 3 תמונות.',
    },
  },
};

function computeDiscount(form) {
  const current = Number(form.prix);
  const original = Number(form.prix_original);
  if (!current || !original || original <= current) return null;
  return Math.round(((original - current) / original) * 100);
}

function storeFromUrl(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') || 'Online'; } catch { return 'Online'; }
}

function previewFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (event) => resolve(event.target.result);
    reader.readAsDataURL(file);
  });
}

function validateStep(step, form, images, text) {
  const errors = {};
  if (step === 0 && images.length === 0) errors.images = text.errors.images;
  if (step === 1) {
    if (!form.titre.trim()) errors.titre = text.errors.title;
    if (form.prix === '') errors.prix = text.errors.price;
    if (form.date_debut && form.date_fin && form.date_fin < form.date_debut) errors.date_fin = text.errors.dates;
  }
  if (step === 2) {
    if (form.onlineMode === 'store') {
      if (!form.magasin.trim()) errors.magasin = text.errors.store;
      if (!form.ville) errors.ville = text.errors.city;
    } else if (!form.url_source.trim()) {
      errors.url_source = text.errors.url;
    }
  }
  return errors;
}

export function PostDealModal({ user, onClose, onSuccess, cityOptions = [], lang = 'en' }) {
  const text = copy[lang === 'he' ? 'he' : 'en'];
  const fileInputRef = useRef(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ titre: '', description: '', prix: '', prix_original: '', magasin: '', ville: '', categorie: 'Food', url_source: '', date_debut: '', date_fin: '', onlineMode: 'store' });
  const [images, setImages] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [uploadPhase, setUploadPhase] = useState(null);
  const discount = useMemo(() => computeDiscount(form), [form]);

  const set = (key, value) => {
    setError('');
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleImages = async (event) => {
    const selected = [...(event.target.files || [])];
    event.target.value = '';
    if (!selected.length) return;
    if (images.length + selected.length > MAX_IMAGES) {
      setFieldErrors((current) => ({ ...current, images: text.errors.maxImages }));
      return;
    }
    const invalid = selected.map(validateImageFile).find(Boolean);
    if (invalid) {
      setFieldErrors((current) => ({ ...current, images: invalid }));
      return;
    }
    try {
      const previews = await Promise.all(selected.map(previewFile));
      setImages((current) => [...current, ...selected.map((file, index) => ({ file, preview: previews[index], id: `${file.name}-${file.size}-${Date.now()}-${index}` }))]);
      setFieldErrors((current) => ({ ...current, images: undefined }));
    } catch {
      setFieldErrors((current) => ({ ...current, images: text.errors.images }));
    }
  };

  const removeImage = (id) => setImages((current) => current.filter((image) => image.id !== id));

  const goNext = () => {
    const errors = validateStep(step, form, images, text);
    if (Object.keys(errors).length) {
      setFieldErrors((current) => ({ ...current, ...errors }));
      setError(text.errors.form);
      return;
    }
    setError('');
    setStep((value) => value + 1);
  };

  const validateAll = () => {
    const errors = [0, 1, 2].reduce((all, currentStep) => ({ ...all, ...validateStep(currentStep, form, images, text) }), {});
    if (!user) errors.auth = text.errors.auth;
    return errors;
  };

  const handlePublish = async () => {
    const errors = validateAll();
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setError(text.errors.form);
      if (errors.images) setStep(0);
      else if (errors.titre || errors.prix || errors.date_fin) setStep(1);
      else setStep(2);
      return;
    }

    setSubmitting(true);
    setError('');
    const uploadPaths = [];
    try {
      setUploadPhase('photo');
      const uploaded = [];
      for (const image of images) {
        const result = await uploadDealImage(image.file, user.id);
        uploaded.push(result);
        uploadPaths.push(result.path);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(text.errors.session);

      setUploadPhase('saving');
      const imageUrls = uploaded.map((item) => item.url);
      const payload = {
        titre: form.titre,
        description: form.description,
        prix: Number(form.prix),
        prix_original: form.prix_original ? Number(form.prix_original) : null,
        magasin: form.magasin.trim() || storeFromUrl(form.url_source),
        ville: form.onlineMode === 'online' ? 'Online' : form.ville,
        categorie: form.onlineMode === 'online' ? 'Online' : form.categorie,
        url_source: form.url_source,
        date_debut: form.date_debut,
        date_fin: form.date_fin,
        image_url: imageUrls[0],
        image_urls: imageUrls,
      };

      const response = await fetch('/api/bons-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || data.erreur) throw new Error(data.erreur || text.errors.failed);
      onSuccess(data.bon_plan?.id || null);
    } catch (publishError) {
      await Promise.all(uploadPaths.map((path) => deleteDealImage(path)));
      setError(publishError.message || text.errors.network);
      setSubmitting(false);
      setUploadPhase(null);
    }
  };

  if (!user) {
    return (
      <Modal title={text.title} subtitle={text.signInSubtitle} onClose={onClose}>
        <div className="dilz-auth-required">
          <p>{text.authText}</p>
          <Button as={Link} href="/auth" variant="primary">{text.signIn}</Button>
          <Button variant="secondary" onClick={onClose}>{text.cancel}</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title={text.title}
      subtitle={text.subtitle}
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={() => step === 0 ? onClose() : setStep((value) => value - 1)}>{step === 0 ? text.cancel : text.back}</Button>
          {step < 3 ? <Button onClick={goNext}>{text.continue}</Button> : (
            <Button loading={submitting} onClick={handlePublish}>{uploadPhase === 'photo' ? text.uploading : uploadPhase === 'saving' ? text.publishing : text.publish}</Button>
          )}
        </>
      )}
    >
      <div className="dilz-post-stepper" aria-label={text.title}>
        {text.steps.map((label, index) => (
          <div key={label} className={['dilz-post-step', step === index && 'is-active', step > index && 'is-complete'].filter(Boolean).join(' ')}>
            <span>{index + 1}</span><strong>{label}</strong>
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="dilz-post-upload">
          <button type="button" className={['dilz-upload-zone', fieldErrors.images && 'has-error'].filter(Boolean).join(' ')} onClick={() => fileInputRef.current?.click()}>
            <span><strong>{text.uploadTitle}</strong><small>{text.uploadHelp}</small></span>
          </button>
          <input ref={fileInputRef} className="dilz-sr-only" type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={handleImages} disabled={submitting || images.length >= MAX_IMAGES} />
          {images.length > 0 && (
            <div className="dilz-upload-gallery">
              {images.map((image, index) => (
                <div className="dilz-upload-gallery__item" key={image.id}>
                  <img src={image.preview} alt={`${text.uploadTitle} ${index + 1}`} />
                  <button type="button" onClick={() => removeImage(image.id)} aria-label={`${text.remove} ${index + 1}`}>×</button>
                  <span>{index + 1}</span>
                </div>
              ))}
              {images.length < MAX_IMAGES && <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>{text.addPhoto}</Button>}
            </div>
          )}
          {fieldErrors.images && <span className="dilz-field__error">{fieldErrors.images}</span>}
        </div>
      )}

      {step === 1 && (
        <div className="dilz-form-grid">
          <Input required label={text.dealTitle} error={fieldErrors.titre} value={form.titre} onChange={(event) => set('titre', event.target.value)} placeholder={lang === 'he' ? 'לדוגמה: Apple Watch SE ב-999 ₪' : 'e.g. Apple Watch SE from 999 ₪'} />
          <Textarea label={text.description} value={form.description} onChange={(event) => set('description', event.target.value)} placeholder={lang === 'he' ? 'מה הופך את הדיל למשתלם?' : 'What makes this deal useful?'} />
          <div className="dilz-form-grid dilz-form-grid--two dilz-price-fields">
            <Input required label={text.price} error={fieldErrors.prix} type="number" min="0" value={form.prix} onChange={(event) => set('prix', event.target.value)} placeholder="999" />
            <Input label={text.oldPrice} type="number" min="0" value={form.prix_original} onChange={(event) => set('prix_original', event.target.value)} placeholder="1299" helper={discount ? `${discount}% ${text.discount}` : text.optional} />
          </div>
          <Select label={text.category} value={form.categorie} onChange={(event) => set('categorie', event.target.value)}>{CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</Select>
          <div className="dilz-form-grid dilz-form-grid--two dilz-date-fields">
            <Input label={text.startDate} type="date" value={form.date_debut} max={form.date_fin || undefined} onChange={(event) => set('date_debut', event.target.value)} />
            <Input label={text.endDate} error={fieldErrors.date_fin} type="date" value={form.date_fin} min={form.date_debut || undefined} onChange={(event) => set('date_fin', event.target.value)} />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="dilz-form-grid">
          <SegmentedControl ariaLabel={text.availability} value={form.onlineMode} onChange={(value) => { set('onlineMode', value); setFieldErrors({}); }} options={[{ value: 'store', label: text.storeMode }, { value: 'online', label: text.onlineMode }]} />
          <Input required={form.onlineMode === 'store'} label={form.onlineMode === 'online' ? text.website : text.store} error={fieldErrors.magasin} value={form.magasin} onChange={(event) => set('magasin', event.target.value)} placeholder={form.onlineMode === 'online' ? 'Amazon, KSP, Terminal X' : 'Bug, Terminal X, Rami Levy'} helper={form.onlineMode === 'online' ? text.onlineStoreHelp : undefined} />
          {form.onlineMode === 'store' && (
            <Select required label={text.city} error={fieldErrors.ville} value={form.ville} onChange={(event) => set('ville', event.target.value)}>
              <option value="">{text.chooseCity}</option>
              {cityOptions.map((city) => <option key={city} value={city}>{traduireVille(city, lang)}</option>)}
            </Select>
          )}
          <Input required={form.onlineMode === 'online'} label={text.url} error={fieldErrors.url_source} type="url" value={form.url_source} onChange={(event) => set('url_source', event.target.value)} placeholder="https://..." helper={form.onlineMode === 'online' ? text.onlineUrlHelp : text.storeUrlHelp} />
        </div>
      )}

      {step === 3 && (
        <div className="dilz-post-preview">
          <div className="dilz-post-preview__gallery">{images.map((image) => <img key={image.id} src={image.preview} alt="" />)}</div>
          <div>
            <span>{form.magasin || text.previewStore} · {form.onlineMode === 'online' ? text.onlineMode : form.ville ? traduireVille(form.ville, lang) : text.previewCity}</span>
            <h3>{form.titre || text.previewTitle}</h3><p>{form.description || text.previewDescription}</p><strong>{form.prix || '0'} ₪</strong>{form.prix_original && <del>{form.prix_original} ₪</del>}
          </div>
        </div>
      )}

      {error && <p className="dilz-form-error">{error}</p>}
    </Modal>
  );
}
