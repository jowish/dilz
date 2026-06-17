import { useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { uploadDealImage, validateImageFile, deleteDealImage } from '../../lib/uploadImage';
import { traduireVille } from '../../lib/translations';
import { Button } from '../ui/Button';
import { Input, Select, Textarea } from '../ui/FormControls';
import { Modal } from '../ui/Modal';
import { SegmentedControl } from '../ui/SegmentedControl';

const CATEGORIES = ['Food', 'Tech', 'Fashion', 'Activities', 'Online'];

function canContinue(step, form, imageFile) {
  if (step === 0) return Boolean(imageFile);
  if (step === 1) return Boolean(form.titre.trim() && form.prix);
  if (step === 2) return Boolean(form.magasin.trim() && (form.onlineMode === 'online' || form.ville));
  return true;
}

function computeDiscount(form) {
  const current = Number(form.prix);
  const original = Number(form.prix_original);
  if (!current || !original || original <= current) return null;
  return Math.round(((original - current) / original) * 100);
}

export function PostDealModal({ user, onClose, onSuccess, cityOptions = [] }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    titre: '',
    description: '',
    prix: '',
    prix_original: '',
    magasin: '',
    ville: '',
    categorie: 'Food',
    url_source: '',
    date_debut: '',
    date_fin: '',
    onlineMode: 'store',
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [uploadPhase, setUploadPhase] = useState(null);

  const discount = useMemo(() => computeDiscount(form), [form]);

  const set = (key, value) => {
    setError('');
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      event.target.value = '';
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (readerEvent) => setImagePreview(readerEvent.target.result);
    reader.readAsDataURL(file);
  };

  const validateAll = () => {
    if (!user) return 'Please sign in to post a deal.';
    if (!imageFile) return 'A clear deal image is required.';
    if (!form.titre.trim()) return 'Deal title is required.';
    if (!form.prix) return 'Current price is required.';
    if (!form.magasin.trim()) return 'Store name is required.';
    if (form.onlineMode === 'store' && !form.ville) return 'Choose a city or mark this deal as online.';
    if (form.date_debut && form.date_fin && form.date_fin < form.date_debut) return 'End date must be after start date.';
    return '';
  };

  const handlePublish = async () => {
    const validationError = validateAll();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError('');
    let uploadPath = null;
    try {
      setUploadPhase('photo');
      const { url, path } = await uploadDealImage(imageFile, user.id);
      uploadPath = path;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Session expired. Please sign in again.');

      setUploadPhase('saving');
      const payload = {
        titre: form.titre,
        description: form.description,
        prix: Number(form.prix),
        prix_original: form.prix_original ? Number(form.prix_original) : null,
        magasin: form.magasin,
        ville: form.onlineMode === 'online' ? 'Online' : form.ville,
        categorie: form.onlineMode === 'online' ? 'Online' : form.categorie,
        url_source: form.url_source,
        date_debut: form.date_debut,
        date_fin: form.date_fin,
        image_url: url,
      };

      const res = await fetch('/api/bons-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.erreur) throw new Error(data.erreur || 'Failed to post deal');
      onSuccess(data.bon_plan?.id || null);
    } catch (publishError) {
      if (uploadPath) await deleteDealImage(uploadPath).catch(() => {});
      setError(publishError.message || 'Network error. Please try again.');
      setSubmitting(false);
      setUploadPhase(null);
    }
  };

  if (!user) {
    return (
      <Modal title="Post a deal" subtitle="Sign in to share real deals with the community." onClose={onClose}>
        <div className="dilz-auth-required">
          <p>Voting, posting and saving are connected to your Dilz account.</p>
          <Button as={Link} href="/auth" variant="primary">Sign in to post</Button>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </Modal>
    );
  }

  const steps = ['Image', 'Details', 'Location', 'Preview'];
  const ready = canContinue(step, form, imageFile);

  return (
    <Modal
      title="Post a deal"
      subtitle="Share a real deal you found with the community."
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={() => step === 0 ? onClose() : setStep((value) => value - 1)}>
            {step === 0 ? 'Cancel' : 'Back'}
          </Button>
          {step < 3 ? (
            <Button disabled={!ready} onClick={() => setStep((value) => value + 1)}>Continue</Button>
          ) : (
            <Button loading={submitting} onClick={handlePublish}>
              {uploadPhase === 'photo' ? 'Uploading image' : uploadPhase === 'saving' ? 'Publishing' : 'Publish deal'}
            </Button>
          )}
        </>
      )}
    >
      <div className="dilz-post-stepper" aria-label="Post deal steps">
        {steps.map((label, index) => (
          <div key={label} className={['dilz-post-step', step === index && 'is-active', step > index && 'is-complete'].filter(Boolean).join(' ')}>
            <span>{index + 1}</span>
            <strong>{label}</strong>
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="dilz-post-upload">
          <label className={['dilz-upload-zone', imagePreview && 'has-image'].filter(Boolean).join(' ')}>
            {imagePreview ? (
              <img src={imagePreview} alt="Deal preview" />
            ) : (
              <span>
                <strong>Upload deal image</strong>
                <small>Use a clear photo or screenshot. JPEG, PNG or WebP up to 5 MB.</small>
              </span>
            )}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImage} disabled={submitting} />
          </label>
          {imagePreview && (
            <div className="dilz-post-upload__actions">
              <Button variant="secondary" onClick={() => document.querySelector('.dilz-upload-zone input')?.click()}>Replace image</Button>
              <Button variant="ghost" onClick={() => { setImageFile(null); setImagePreview(null); }}>Remove</Button>
            </div>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="dilz-form-grid">
          <Input label="Deal title" value={form.titre} onChange={(event) => set('titre', event.target.value)} placeholder="e.g. Apple Watch SE from NIS 999" />
          <Textarea label="Description" value={form.description} onChange={(event) => set('description', event.target.value)} placeholder="What makes this deal useful?" />
          <div className="dilz-form-grid dilz-form-grid--two">
            <Input label="Current price" type="number" value={form.prix} onChange={(event) => set('prix', event.target.value)} placeholder="999" />
            <Input label="Old price" type="number" value={form.prix_original} onChange={(event) => set('prix_original', event.target.value)} placeholder="1299" helper={discount ? `${discount}% discount` : 'Optional'} />
          </div>
          <Select label="Category" value={form.categorie} onChange={(event) => set('categorie', event.target.value)}>
            {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
          </Select>
          <div className="dilz-form-grid dilz-form-grid--two">
            <Input label="Start date" type="date" value={form.date_debut} max={form.date_fin || undefined} onChange={(event) => set('date_debut', event.target.value)} />
            <Input label="End date" type="date" value={form.date_fin} min={form.date_debut || undefined} onChange={(event) => set('date_fin', event.target.value)} />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="dilz-form-grid">
          <SegmentedControl
            ariaLabel="Deal availability"
            value={form.onlineMode}
            onChange={(value) => set('onlineMode', value)}
            options={[{ value: 'store', label: 'In-store' }, { value: 'online', label: 'Online' }]}
          />
          <Input label="Store name" value={form.magasin} onChange={(event) => set('magasin', event.target.value)} placeholder="Bug, Terminal X, Rami Levy" />
          {form.onlineMode === 'store' && (
            <Select label="City" value={form.ville} onChange={(event) => set('ville', event.target.value)}>
              <option value="">Choose city</option>
              {cityOptions.map((city) => <option key={city} value={city}>{traduireVille(city, 'en')}</option>)}
            </Select>
          )}
          <Input label="Deal URL" type="url" value={form.url_source} onChange={(event) => set('url_source', event.target.value)} placeholder="https://..." helper="Optional, but recommended for trust." />
        </div>
      )}

      {step === 3 && (
        <div className="dilz-post-preview">
          <div className="dilz-post-preview__image">{imagePreview && <img src={imagePreview} alt="" />}</div>
          <div>
            <span>{form.magasin || 'Store'} · {form.onlineMode === 'online' ? 'Online' : form.ville ? traduireVille(form.ville, 'en') : 'City'}</span>
            <h3>{form.titre || 'Deal title'}</h3>
            <p>{form.description || 'A short helpful description will appear here.'}</p>
            <strong>NIS {form.prix || '0'}</strong>
            {form.prix_original && <del>NIS {form.prix_original}</del>}
          </div>
        </div>
      )}

      {error && <p className="dilz-form-error">{error}</p>}
    </Modal>
  );
}
