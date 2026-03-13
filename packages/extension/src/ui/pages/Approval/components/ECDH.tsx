import { Button, Card, Column, Content, Footer, Header, Layout, Row, Text } from '@/ui/components';
import WebsiteBar from '@/ui/components/WebsiteBar';
import { useI18n } from '@/ui/hooks/useI18n';
import { useApproval } from '@/ui/utils';

interface Props {
  params: {
    data: {
      externalPubKey: string;
    };
    session: {
      origin: string;
      icon: string;
      name: string;
    };
  };
}

export default function ECDH({ params: { data, session } }: Props) {
  const [_, resolveApproval, rejectApproval] = useApproval();
  const { t } = useI18n();

  const handleCancel = () => {
    rejectApproval();
  };

  const handleConfirm = () => {
    resolveApproval();
  };

  // Format public key for display (show first 20 and last 20 chars)
  const formatPubKey = (pubKey: string) => {
    if (pubKey.length <= 44) return pubKey;
    return `${pubKey.slice(0, 20)}...${pubKey.slice(-20)}`;
  };

  return (
    <Layout>
      <Content>
        <Header>
          <WebsiteBar session={session} />
        </Header>
        <Column>
          <Text text={t('ecdh_request')} preset="title-bold" textCenter mt="lg" />
          <Text
            text={t('this_site_is_requesting_to_compute_a_shared_secret')}
            preset="sub"
            textCenter
            mt="lg"
          />

          <Card style={{ marginTop: 16 }}>
            <Column>
              <Text text={t('external_public_key')} preset="sub" color="textDim" />
              <Text
                text={formatPubKey(data.externalPubKey)}
                style={{ wordBreak: 'break-all', marginTop: 8 }}
              />
            </Column>
          </Card>

          <Card style={{ marginTop: 16, backgroundColor: 'rgba(255, 193, 7, 0.1)' }}>
            <Text
              text={t('ecdh_warning')}
              preset="sub"
              color="warning"
            />
          </Card>
        </Column>
      </Content>

      <Footer>
        <Row full>
          <Button text={t('reject')} full preset="default" onClick={handleCancel} />
          <Button text={t('approve')} full preset="primary" onClick={handleConfirm} />
        </Row>
      </Footer>
    </Layout>
  );
}
