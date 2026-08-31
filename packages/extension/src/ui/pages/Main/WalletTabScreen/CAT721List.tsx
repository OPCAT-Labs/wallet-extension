import React, { CSSProperties, useEffect, useMemo, useState } from 'react';

import { CAT721Balance } from '@/shared/types';
import { Column, Row, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { CAT721CollectionCard } from '@/ui/components/CAT721CollectionCard';
import { Empty } from '@/ui/components/Empty';
import { Pagination } from '@/ui/components/Pagination';
import { useI18n } from '@/ui/hooks/useI18n';
import { useCurrentAccount } from '@/ui/state/accounts/hooks';
import { useChainType } from '@/ui/state/settings/hooks';
import { useIsInExpandView, useSupportedAssets } from '@/ui/state/ui/hooks';
import { colors } from '@/ui/theme/colors';
import { useWallet } from '@/ui/utils';
import { TestIds } from '@/ui/utils/test-ids';
import { CloseOutlined, LoadingOutlined, SearchOutlined } from '@ant-design/icons';

import { useNavigate } from '../../MainRoute';
import { filterCollectionsByQuery } from '../../CAT721/cat721Filter';

// The search box only renders once the wallet holds enough collections for scanning to beat
// scrolling (same spirit as the collection screen's item threshold).
const SEARCH_THRESHOLD = 4;

const $searchBox: CSSProperties = {
  display: 'flex',
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

export function CAT721List() {
  const navigate = useNavigate();
  const wallet = useWallet();
  const currentAccount = useCurrentAccount();
  const chainType = useChainType();
  const { t } = useI18n();

  const [collections, setCollections] = useState<CAT721Balance[]>([]);
  const [total, setTotal] = useState(-1);
  const [pagination, setPagination] = useState({ currentPage: 1, pageSize: 100 });
  // Client-side collection search over the fetched page (name / collectionId).
  const [query, setQuery] = useState('');
  const visibleCollections = useMemo(() => filterCollectionsByQuery(collections, query), [collections, query]);

  const tools = useTools();

  const supportedAssets = useSupportedAssets();

  const inExpandView = useIsInExpandView();
  const justifyContent = inExpandView ? 'left' : 'space-between';

  useEffect(() => {
    const fetchData = async () => {
      if (!supportedAssets.assets.CAT20) {
        setCollections([]);
        setTotal(0);
        return;
      }
      try {
        const { list, total } = await wallet.getCAT721List(
          currentAccount.address,
          pagination.currentPage,
          pagination.pageSize
        );
        setCollections(list);
        setTotal(total);
      } catch (e) {
        setCollections([]);
        tools.toastError((e as Error).message);
      } finally {
        // tools.showLoading(false);
      }
    };

    fetchData();
  }, [pagination, currentAccount.address, chainType, supportedAssets.key]);

  if (total === -1) {
    return (
      <Column style={{ minHeight: 150 }} itemsCenter justifyCenter>
        <LoadingOutlined />
      </Column>
    );
  }

  if (total === 0) {
    return (
      <Column style={{ minHeight: 150 }} itemsCenter justifyCenter>
        <Empty text={t('empty')} />
      </Column>
    );
  }

  return (
    <Column>
      {collections.length > SEARCH_THRESHOLD && (
        <div style={$searchBox}>
          <SearchOutlined style={{ color: colors.textDim, fontSize: 12 }} />
          <input
            style={$searchInput}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search_collections')}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            data-testid={TestIds.CAT721.LIST_SEARCH_INPUT}
          />
          {query.length > 0 && (
            <CloseOutlined
              style={{ color: colors.textDim, fontSize: 11, cursor: 'pointer' }}
              onClick={() => setQuery('')}
              data-testid={TestIds.CAT721.LIST_SEARCH_CLEAR}
            />
          )}
        </div>
      )}

      {visibleCollections.length === 0 && query.trim().length > 0 ? (
        <Column style={{ minHeight: 100 }} itemsCenter justifyCenter>
          <Text text={t('no_matches')} preset="sub" textCenter />
        </Column>
      ) : (
        <Row style={{ flexWrap: 'wrap', justifyContent }} gap="sm">
          {visibleCollections.map((data, index) => (
            <CAT721CollectionCard
              key={index}
              cat721Balance={data}
              contentType={data.contentType}
              onClick={() => {
                navigate('CAT721CollectionScreen', {
                  collectionId: data.collectionId
                });
              }}
            />
          ))}
        </Row>
      )}

      <Row justifyCenter mt="lg">
        <Pagination
          pagination={pagination}
          total={total}
          onChange={(pagination) => {
            setPagination(pagination);
          }}
        />
      </Row>
    </Column>
  );
}
