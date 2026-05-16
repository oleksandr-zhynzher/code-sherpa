import { ProductShell } from '../../components/layout/product-shell';
import { SetupPageClient } from './setup-page-client';

export default function SetupPage() {
  return (
    <ProductShell activePath="/setup">
      <SetupPageClient />
    </ProductShell>
  );
}
