import { ProductShell } from '../../components/layout/product-shell';
import { PocApp } from '../../components/PocApp';

export default function LearnPage() {
  return (
    <ProductShell activePath="/learn">
      <PocApp />
    </ProductShell>
  );
}
