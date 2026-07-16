import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { CAT721CollectionInfo } from '@/shared/types';
import { Button, Card, Column, Content, Header, Layout, Row, Text } from '@/ui/components';
import CAT721Preview from '@/ui/components/CAT721Preview';
import { Line } from '@/ui/components/Line';
import { Section } from '@/ui/components/Section';
import { useI18n } from '@/ui/hooks/useI18n';
import { useNavigate } from '@/ui/pages/MainRoute';
import { useCAT721NFTContentBaseUrl } from '@/ui/state/settings/hooks';
import { TestIds } from '@/ui/utils/test-ids';

import { fetchNftTraits, NftTrait } from './nftTraits';

export default function CAT721NFTScreen() {
  const { state } = useLocation();
  const props = state as {
    collectionInfo: CAT721CollectionInfo;
    localId: string;
  };
  const { t } = useI18n();

  const collectionInfo = props.collectionInfo;
  const localId = props.localId;

  const contentBaseUrl = useCAT721NFTContentBaseUrl();
  const [traits, setTraits] = useState<NftTrait[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchNftTraits(contentBaseUrl, collectionInfo.collectionId, localId)
      .then(result => {
        if (!cancelled) setTraits(result);
      })
      .catch(() => {
        if (!cancelled) setTraits([]);
      });
    return () => {
      cancelled = true;
    };
  }, [contentBaseUrl, collectionInfo.collectionId, localId]);

  const navigate = useNavigate();

  return (
    <Layout testid={TestIds.CAT721.NFT_SCREEN}>
      <Header
        onBack={() => {
          window.history.go(-1);
        }}>
        <Row>
          <Text text={`${collectionInfo.name} `} />
          <Text text={`#${localId}`} color="primary" />
        </Row>
      </Header>
      <Content>
        <Row justifyCenter>
          <CAT721Preview
            preset="large"
            collectionId={collectionInfo.collectionId}
            contentType={collectionInfo.contentType}
            localId={localId}
          />
        </Row>

        <Card style={{ borderRadius: 15 }}>
          <Column fullX my="sm">
            <Section title={t('collection_id')} value={collectionInfo.collectionId} showCopyIcon />
            <Line />
            <Section title={t('collection')} value={collectionInfo.name} />
          </Column>
        </Card>

        {traits.length > 0 && (
          <Card style={{ borderRadius: 15 }} testid={TestIds.CAT721.NFT_ATTRIBUTES}>
            <Column fullX my="sm">
              <Row px="md">
                <Text text={t('attributes')} preset="bold" />
              </Row>
              <Line />
              {traits.map((trait, index) => (
                <Column key={`${trait.trait}-${index}`} gap="zero">
                  {index > 0 && <Line />}
                  <Section title={trait.trait} value={trait.value} />
                </Column>
              ))}
            </Column>
          </Card>
        )}
        <Button
          preset="primary"
          text={t('send')}
          icon="send"
          testid={TestIds.CAT721.SEND_BUTTON}
          onClick={() => {
            navigate('SendCAT721Screen', {
              collectionInfo: collectionInfo,
              localId: localId
            });
          }}></Button>
      </Content>
    </Layout>
  );
}
