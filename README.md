# MyFinance Dashboard

Dashboard keuangan personal berbasis Next.js, Firebase Authentication, dan Cloud Firestore.

## Fitur

- Login/register email-password dan Google Sign-In.
- Dashboard cashflow, saving rate, debt ratio, dana darurat, dan tren 6 bulan.
- CRUD transaksi, budget bulanan, financial goals, wishlist group, dan checklist wishlist.
- Firestore Security Rules berbasis UID owner dan validasi schema.
- Firebase Analytics/exception reporting opsional.

## Setup Lokal

1. Install dependency:

   ```bash
   npm install
   ```

2. Salin konfigurasi Firebase:

   ```bash
   cp .env.local.example .env.local
   ```

3. Isi nilai Firebase di `.env.local`.
   `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` opsional; app tetap berjalan tanpa Analytics.

4. Jalankan dev server:

   ```bash
   npm run dev
   ```

## Firebase

- Aktifkan Firebase Authentication provider email-password dan Google jika diperlukan.
- Buat Cloud Firestore database.
- Deploy rules setelah review:

  ```bash
  npx -y firebase-tools@latest deploy --only firestore:rules
  ```

## Validasi

```bash
npm run lint
npm run build
```

## Catatan Data

- Data disimpan di `users/{uid}/...`.
- Budget baru memakai field `month` dengan format `YYYY-MM`.
- Budget lama tanpa `month` masih ditampilkan sebagai data legacy agar tidak hilang dari UI.
