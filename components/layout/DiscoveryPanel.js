import { Button } from '../ui/Button';
import { FilterChip } from '../ui/FilterChip';
import { SearchBar } from '../ui/SearchBar';

export function DiscoveryPanel({
  cityLabel,
  totalPromos = 0,
  totalDeals = 0,
  onSearch,
  onCityClick,
  onCommunity,
  onSupermarkets,
  onEndingSoon,
  onBigDiscount,
}) {
  const filters = [
    ['Near me', onCityClick],
    ['Ending soon', onEndingSoon],
    ['30%+', onBigDiscount],
    ['Food', onCommunity],
    ['Fashion', onCommunity],
    ['Supermarkets', onSupermarkets],
    ['Electronics', onCommunity],
    ['Online', onCommunity],
  ];

  return (
    <section className="dilz-discovery">
      <div className="dilz-discovery__copy">
        <p className="dilz-eyebrow">Live in Israel</p>
        <h1>Best deals near you</h1>
        <p>Store promos and community finds across Israel.</p>
        <div className="dilz-discovery__search">
          <SearchBar onFocus={onSearch} placeholder="Search deals, stores, cities" />
        </div>
        <div className="dilz-discovery__filters">
          {filters.map(([label, action]) => (
            <FilterChip key={label} onClick={action}>{label}</FilterChip>
          ))}
        </div>
      </div>
      <aside className="dilz-discovery__preview" aria-label="Today's savings preview">
        <div className="dilz-preview-card">
          <span>Today on Dilz</span>
          <strong>{totalPromos.toLocaleString()} store promos</strong>
          <p>{totalDeals.toLocaleString()} community deals ready to check.</p>
          <Button variant="soft" onClick={onCityClick}>{cityLabel || 'Choose city'}</Button>
        </div>
      </aside>
    </section>
  );
}
