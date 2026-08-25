/**
 * Search / sort / trait-filter bar for the CAT-721 collection screen.
 *
 * Extension adaptation of catmint's filter surfaces: the search box + trait chips mirror the
 * profile "Owned" grid (client-side, counted values, OR-within-trait / AND-across-traits,
 * Clear filters), and the sort control is the wallet-relevant slice of the collection page's
 * sort dropdown (Token ID only — a holder view has no listing prices). Trait value panels
 * expand inline (accordion) instead of a dropdown overlay: simpler in the popup layout.
 */
import { CSSProperties, useState } from 'react';

import { Row, Text } from '@/ui/components';
import { useI18n } from '@/ui/hooks/useI18n';
import { colors } from '@/ui/theme/colors';
import { TestIds } from '@/ui/utils/test-ids';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CloseOutlined,
  DownOutlined,
  LoadingOutlined,
  SearchOutlined,
  UpOutlined
} from '@ant-design/icons';

import { countSelectedTraits, LocalIdSort, TraitFacet, TraitSelection } from './cat721Filter';

interface CAT721FilterBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  sort: LocalIdSort;
  onToggleSort: () => void;
  facets: TraitFacet[];
  selection: TraitSelection;
  onToggleTrait: (trait: string, value: string) => void;
  onClearTraits: () => void;
  traitsLoading: boolean;
  /** Warm-up progress: items whose traits have loaded / total owned items. */
  traitsLoaded: number;
  traitsTotal: number;
  /** Search + sort row only appears for collections large enough to need it. */
  showSearchSort: boolean;
}

const $searchBox: CSSProperties = {
  display: 'flex',
  flex: 1,
  alignItems: 'center',
  gap: 8,
  backgroundColor: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  padding: '0 10px',
  height: 36
};

const $searchInput: CSSProperties = {
  flex: 1,
  minWidth: 0,
  backgroundColor: 'transparent',
  border: 'none',
  outline: 'none',
  color: colors.text,
  fontSize: 12
};

const $chip: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  backgroundColor: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: 999,
  padding: '4px 10px',
  cursor: 'pointer',
  maxWidth: 170
};

const $chipActive: CSSProperties = {
  ...$chip,
  backgroundColor: colors.primary_dark,
  border: `1px solid ${colors.primary}`
};

const $valuePill: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  backgroundColor: colors.bg3,
  borderRadius: 999,
  padding: '3px 10px',
  cursor: 'pointer',
  maxWidth: '100%'
};

const $valuePillActive: CSSProperties = {
  ...$valuePill,
  backgroundColor: colors.primary_dark,
  outline: `1px solid ${colors.primary}`
};

const $ellipsis: CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
};

export default function CAT721FilterBar({
  query,
  onQueryChange,
  sort,
  onToggleSort,
  facets,
  selection,
  onToggleTrait,
  onClearTraits,
  traitsLoading,
  traitsLoaded,
  traitsTotal,
  showSearchSort
}: CAT721FilterBarProps) {
  const { t } = useI18n();
  // Which trait's value panel is expanded (accordion, one at a time).
  const [openTrait, setOpenTrait] = useState<string | null>(null);
  const selectedCount = countSelectedTraits(selection);
  const openFacet = openTrait ? facets.find(f => f.trait === openTrait) ?? null : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Row 1 — search + sort */}
      {showSearchSort && (
        <Row itemsCenter gap="sm">
          <div style={$searchBox}>
            <SearchOutlined style={{ color: colors.textDim, fontSize: 12 }} />
            <input
              style={$searchInput}
              value={query}
              onChange={e => onQueryChange(e.target.value)}
              placeholder={t('search_by_id_or_trait')}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              data-testid={TestIds.CAT721.FILTER_SEARCH_INPUT}
            />
            {query.length > 0 && (
              <CloseOutlined
                style={{ color: colors.textDim, fontSize: 11, cursor: 'pointer' }}
                onClick={() => onQueryChange('')}
                data-testid={TestIds.CAT721.FILTER_SEARCH_CLEAR}
              />
            )}
          </div>
          <Row
            itemsCenter
            clickable
            onClick={onToggleSort}
            style={{
              gap: 4,
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              padding: '0 10px',
              height: 36,
              flexShrink: 0
            }}
            data-testid={TestIds.CAT721.FILTER_SORT_TOGGLE}>
            {sort === 'asc' ? (
              <ArrowUpOutlined style={{ color: colors.text, fontSize: 11 }} />
            ) : (
              <ArrowDownOutlined style={{ color: colors.text, fontSize: 11 }} />
            )}
            <Text text="ID" size="xs" color="white" />
          </Row>
        </Row>
      )}

      {/* Row 2 — trait chips. Wrapping layout, NOT a horizontal scroller: collections carry many
          traits (13 observed on testnet) and a scroll row hides most of them with no affordance. */}
      {(facets.length > 0 || traitsLoading) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          {facets.map(facet => {
            const picked = selection[facet.trait]?.length ?? 0;
            const open = openTrait === facet.trait;
            const active = picked > 0;
            return (
              <div
                key={facet.trait}
                style={active ? $chipActive : $chip}
                onClick={() => setOpenTrait(open ? null : facet.trait)}
                data-testid={`${TestIds.CAT721.FILTER_TRAIT_CHIP}-${facet.trait}`}>
                <Text
                  text={picked > 0 ? `${facet.trait} · ${picked}` : facet.trait}
                  size="xs"
                  color={active ? 'white' : 'textDim'}
                  style={$ellipsis}
                />
                {open ? (
                  <UpOutlined style={{ color: colors.textDim, fontSize: 9 }} />
                ) : (
                  <DownOutlined style={{ color: colors.textDim, fontSize: 9 }} />
                )}
              </div>
            );
          })}
          {selectedCount > 0 && (
            <div
              style={{ ...$chip, backgroundColor: 'transparent', border: 'none' }}
              onClick={() => {
                onClearTraits();
                setOpenTrait(null);
              }}
              data-testid={TestIds.CAT721.FILTER_CLEAR_TRAITS}>
              <CloseOutlined style={{ color: colors.red, fontSize: 10 }} />
              <Text text={t('clear_filters')} size="xs" color="red" />
            </div>
          )}
          {traitsLoading && (
            <Row itemsCenter style={{ gap: 6, padding: '0 4px' }} data-testid={TestIds.CAT721.FILTER_TRAITS_PROGRESS}>
              <LoadingOutlined style={{ color: colors.textDim, fontSize: 11 }} />
              <Text text={`${t('loading_traits')} ${traitsLoaded}/${traitsTotal}`} size="xxs" color="textDim" />
            </Row>
          )}
        </div>
      )}

      {/* Expanded value panel for the open trait */}
      {openFacet && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 10,
            padding: 10
          }}
          data-testid={TestIds.CAT721.FILTER_VALUE_PANEL}>
          {openFacet.values.map(({ value, count }) => {
            const picked = selection[openFacet.trait]?.includes(value) ?? false;
            return (
              <div
                key={value}
                style={picked ? $valuePillActive : $valuePill}
                onClick={() => onToggleTrait(openFacet.trait, value)}
                data-testid={`${TestIds.CAT721.FILTER_TRAIT_VALUE}-${openFacet.trait}-${value}`}>
                <Text text={value} size="xs" color={picked ? 'white' : 'textDim'} style={$ellipsis} />
                <Text text={String(count)} size="xxs" color="textDim" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
