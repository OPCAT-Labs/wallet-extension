import { useEffect, useMemo, useState } from 'react';

import { AddressCAT721CollectionSummary } from '@/shared/types';
import { Card, Column, Content, Header, Icon, Layout, Row, Text } from '@/ui/components';
import CAT721Preview from '@/ui/components/CAT721Preview';
import { Line } from '@/ui/components/Line';
import { Section } from '@/ui/components/Section';
import { useI18n } from '@/ui/hooks/useI18n';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { useCAT721NFTContentBaseUrl } from '@/ui/state/settings/hooks';
import { useIsInExpandView } from '@/ui/state/ui/hooks';
import { colors } from '@/ui/theme/colors';
import { fontSizes } from '@/ui/theme/font';
import { useLocationState, useWallet } from '@/ui/utils';
import { TestIds } from '@/ui/utils/test-ids';
import { LoadingOutlined } from '@ant-design/icons';

import { useNavigate } from '../MainRoute';
import {
  buildTraitFacets,
  countSelectedTraits,
  filterIdsByTraits,
  LocalIdSort,
  searchLocalIds,
  sortLocalIds,
  toggleTraitValue,
  TraitSelection
} from './cat721Filter';
import CAT721FilterBar from './CAT721FilterBar';
import { useCAT721Traits } from './useCAT721Traits';

// Search/sort controls only appear above this item count (catmint's owned-tab threshold) — a
// handful of tiles doesn't need them. Trait chips show whenever facets exist, regardless of count.
const SEARCH_THRESHOLD = 8;

interface LocationState {
  collectionId: string;
}

export default function CAT721CollectionScreen() {
  const { t } = useI18n();
  const { collectionId } = useLocationState<LocationState>();
  const [collectionSummary, setCollectionSummary] = useState<AddressCAT721CollectionSummary>({
    collectionInfo: {
      collectionId: '',
      name: '',
      symbol: '',
      description: '',
      max: '0',
      premine: '0',
      contentType: ''
    },
    localIds: []
  });

  const wallet = useWallet();

  const account = useCurrentAccount();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    wallet.getAddressCAT721CollectionSummary(account.address, collectionId).then((collectionSummary) => {
      setCollectionSummary(collectionSummary);
      setLoading(false);
    });
  }, []);

  const navigate = useNavigate();

  const inExpandView = useIsInExpandView();
  const justifyContent = inExpandView ? 'left' : 'space-between';

  // ── Client-side search / sort / trait filters (catmint-style) ──────────────────────────────
  const contentBaseUrl = useCAT721NFTContentBaseUrl();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<LocalIdSort>('asc');
  const [traitSel, setTraitSel] = useState<TraitSelection>({});
  const localIds = useMemo(() => collectionSummary.localIds ?? [], [collectionSummary]);
  const itemCount = localIds.length;
  const { traitsById, loading: traitsLoading } = useCAT721Traits(contentBaseUrl, collectionId, localIds);
  const facets = useMemo(() => buildTraitFacets(traitsById), [traitsById]);
  const visibleLocalIds = useMemo(
    () => sortLocalIds(searchLocalIds(filterIdsByTraits(localIds, traitsById, traitSel), traitsById, query), sort),
    [localIds, traitsById, traitSel, query, sort]
  );
  const filtersActive = query.trim().length > 0 || countSelectedTraits(traitSel) > 0;
  const showSearchSort = itemCount > SEARCH_THRESHOLD;
  const showFilterBar = showSearchSort || facets.length > 0 || traitsLoading;

  if (loading) {
    return (
      <Layout>
        <Content itemsCenter justifyCenter>
          <Icon size={fontSizes.xxxl} color="primary">
            <LoadingOutlined />
          </Icon>
        </Content>
      </Layout>
    );
  }

  if (!collectionSummary || !collectionSummary.collectionInfo) {
    return (
      <Layout>
        <Header
          onBack={() => {
            window.history.go(-1);
          }}
        />
        <Content itemsCenter justifyCenter>
          <Text text={t('collection_not_found')} />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout testid={TestIds.CAT721.COLLECTION_SCREEN}>
      <Header
        onBack={() => {
          window.history.go(-1);
        }}
      />
      {collectionSummary && (
        <Content>
          <Row py="xl" pb="md">
            <Text text={collectionSummary.collectionInfo.name} preset="title" textCenter size="xl" color="primary" />
          </Row>

          <Card style={{ borderRadius: 15 }}>
            <Column fullX my="sm">
              <Section title={t('collection_id')} value={collectionSummary.collectionInfo.collectionId} showCopyIcon />
              <Line />
              <Section title={t('collection')} value={collectionSummary.collectionInfo.name} />
              <Line />
              <Section title={t('symbol')} value={collectionSummary.collectionInfo.symbol} />
              <Line />

              <Section title={t('max_supply')} value={collectionSummary.collectionInfo.max} />
              <Line />

              <Section title={t('premine')} value={collectionSummary.collectionInfo.premine} />

              {collectionSummary.collectionInfo.description ? (
                <Row
                  style={{
                    backgroundColor: colors.border,
                    height: 1
                  }}></Row>
              ) : null}

              {collectionSummary.collectionInfo.description ? (
                <Row>
                  <Text text={collectionSummary.collectionInfo.description} preset="sub" />
                </Row>
              ) : null}
            </Column>
          </Card>

          {showFilterBar && (
            <CAT721FilterBar
              query={query}
              onQueryChange={setQuery}
              sort={sort}
              onToggleSort={() => setSort((s) => (s === 'asc' ? 'desc' : 'asc'))}
              facets={facets}
              selection={traitSel}
              onToggleTrait={(trait, value) => setTraitSel((sel) => toggleTraitValue(sel, trait, value))}
              onClearTraits={() => setTraitSel({})}
              traitsLoading={traitsLoading}
              traitsLoaded={traitsById.size}
              traitsTotal={itemCount}
              showSearchSort={showSearchSort}
            />
          )}

          {itemCount > 0 && visibleLocalIds.length === 0 && filtersActive && (
            <Column itemsCenter justifyCenter style={{ minHeight: 100 }} gap="md">
              <Text text={t('no_matches')} preset="sub" textCenter />
              <Row
                clickable
                onClick={() => {
                  setQuery('');
                  setTraitSel({});
                }}
                style={{
                  backgroundColor: colors.card,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 999,
                  padding: '6px 18px'
                }}
                data-testid={TestIds.CAT721.FILTER_RESET}>
                <Text text={t('clear_filters')} size="xs" color="primary" />
              </Row>
            </Column>
          )}

          {visibleLocalIds.length > 0 && (
            <Row style={{ flexWrap: 'wrap', justifyContent }}>
              {visibleLocalIds.map((localId) => (
                <CAT721Preview
                  key={localId}
                  preset="medium"
                  collectionId={collectionSummary.collectionInfo.collectionId}
                  contentType={collectionSummary.collectionInfo.contentType}
                  localId={localId}
                  onClick={() => {
                    navigate('CAT721NFTScreen', {
                      collectionInfo: collectionSummary.collectionInfo,
                      localId
                    });
                  }}
                />
              ))}
            </Row>
          )}
        </Content>
      )}
    </Layout>
  );
}
