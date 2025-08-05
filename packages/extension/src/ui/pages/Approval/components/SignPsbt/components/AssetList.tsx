import { Column, Row, Text } from '@/ui/components';
import CAT20PreviewCard from '@/ui/components/CAT20PreviewCard';

const AssetList = ({
  cat20,
  t,
  isToSign,
  isMyAddress,
  cat20PriceMap
}) => {
  // use provided properties isToSign or isMyAddress to determine text color
  const textColor = isToSign ? 'white' : isMyAddress ? 'white' : 'textDim';

  return (
    <>
      {cat20.length > 0 && (
        <Row>
          <Column justifyCenter>
            <Text text={t('cat20')} color={textColor} />
            <Row overflowX gap="lg" style={{ width: 280 }} pb="lg">
              {cat20.map((w) => (
                <CAT20PreviewCard key={w.tokenId} balance={w} price={cat20PriceMap?.[w.tokenId]} />
              ))}
            </Row>
          </Column>
        </Row>
      )}
    </>
  );
};

export default AssetList;
