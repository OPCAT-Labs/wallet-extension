import { Button, Card, Column, Content, Footer, Header, Layout, Row, Text } from '@/ui/components';
import WebsiteBar from '@/ui/components/WebsiteBar';
import { useApproval } from '@/ui/utils';

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
          <Text text="Get PKH By Path" preset="title-bold" textCenter mt="lg" />
          <Text
            text="This site is requesting to derive a public key hash from the following path:"
            preset="sub"
            textCenter
            mt="lg"
          />

          <Card style={{ marginTop: 16 }}>
            <Column>
              <Text text="Derivation Path" preset="sub" color="textDim" />
              <Text
                text={data.path}
                style={{ wordBreak: 'break-all', marginTop: 8 }}
              />
            </Column>
          </Card>

          <Card style={{ marginTop: 16, backgroundColor: 'rgba(255, 193, 7, 0.1)' }}>
            <Text
              text="This will derive a public key hash (PKH) from your wallet using the specified path. The PKH can be used to identify you in encrypted communications."
              preset="sub"
              color="warning"
            />
          </Card>
        </Column>
      </Content>

      <Footer>
        <Row full>
          <Button text="Reject" full preset="default" onClick={handleCancel} />
          <Button text="Approve" full preset="primary" onClick={handleConfirm} />
        </Row>
      </Footer>
    </Layout>
  );
}
