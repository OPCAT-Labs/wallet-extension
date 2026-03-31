import { Button, Card, Column, Content, Footer, Header, Layout, Row, Text } from '@/ui/components';
import WebsiteBar from '@/ui/components/WebsiteBar';
import { useI18n } from '@/ui/hooks/useI18n';
import { useApproval } from '@/ui/utils';
import { TestIds } from '@/ui/utils/test-ids';

interface Props {
  params: {
    data: {
      path: string;
    };
    session: {
      origin: string;
      icon: string;
      name: string;
    };
  };
}

export default function GetPKHByPath({ params: { data, session } }: Props) {
  const [_, resolveApproval, rejectApproval] = useApproval();
  const { t } = useI18n();

  const handleCancel = () => {
    rejectApproval();
  };

  const handleConfirm = () => {
    resolveApproval();
  };

  return (
    <Layout>
      <Content>
        <Header>
          <WebsiteBar session={session} />
        </Header>
        <Column>
          <Text text={t('get_pkh_by_path_request')} preset="title-bold" textCenter mt="lg" />
          <Text
            text={t('get_pkh_by_path_description')}
            preset="sub"
            textCenter
            mt="lg"
          />

          <Card style={{ marginTop: 16 }}>
            <Column>
              <Text text={t('derivation_path')} preset="sub" color="textDim" />
              <Text
                text={data.path}
                style={{ wordBreak: 'break-all', marginTop: 8 }}
              />
            </Column>
          </Card>

          <Card style={{ marginTop: 16, backgroundColor: 'rgba(255, 193, 7, 0.1)' }}>
            <Text
              text={t('get_pkh_by_path_warning')}
              preset="sub"
              color="warning"
            />
          </Card>
        </Column>
      </Content>

      <Footer>
        <Row full>
          <Button text={t('reject')} full preset="default" onClick={handleCancel} testid={TestIds.APPROVAL.REJECT_BUTTON} />
          <Button text={t('approve')} full preset="primary" onClick={handleConfirm} testid={TestIds.APPROVAL.APPROVE_BUTTON} />
        </Row>
      </Footer>
    </Layout>
  );
}
