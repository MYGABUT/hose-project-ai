# Android UI Redesign: YouTube-Style + Instagram Product Gallery

## 1. Goal
Redesign the WMS Android app to visually resemble YouTube's UI (dark theme, bottom navigation, top search bar, card-based layout) and add an Instagram-style 3-column photo grid gallery when viewing product details.

## 2. Proposed Changes

### Theme & Colors (`Color.kt`, `Theme.kt`)
- Replace default purple scheme with YouTube-inspired palette:
  - Dark background (`#0F0F0F`), surface (`#1F1F1F`), card (`#272727`)
  - YouTube red accent (`#FF0000`) for primary actions
  - White text on dark surfaces
- Force dark theme by default (like YouTube).

---

### Home Screen (`HomeScreen.kt`) → YouTube-style Dashboard
- **Top Bar**: App logo/name + Search icon + Profile avatar
- **Module Cards**: Replace square grid with YouTube-style horizontal scrollable "chips" for categories (Gudang, Produksi, QC) + vertical list of feature cards that look like YouTube video thumbnails:
  - Each card has a colored icon/thumbnail area, title, and subtitle
  - Rounded corners, subtle elevation
- **Bottom Navigation Bar**: 5 tabs:
  1. 🏠 Home
  2. 📥 Inbound
  3. 🔍 Inquiry (Scanner)
  4. 📦 Outbound
  5. 👤 Profile/Settings

---

### Bottom Navigation → New `MainScreen.kt`
- Create a wrapper `MainScreen` composable that holds the `BottomNavigation` and a nested `NavHost` for the home tabs.
- Update `MainActivity.kt` to use this new structure.

---

### Product Detail Gallery → Instagram-style (`ProductGallerySection`)
- Add a new `@Composable fun ProductPhotoGrid()` that renders a 3-column `LazyVerticalGrid` of square thumbnails.
- Integrate into `InquiryScreen`'s detail card section below the batch info.
- Since there are no actual product photos from the backend, we will use placeholder colored tiles with product initial letters as demo content to showcase the grid layout. The grid structure will be ready for real images when the backend supports them.

## 3. Verification Plan

### Automated Build Test
- Run `./gradlew :app:assembleDebug` to verify compilation.

### Manual Verification
- Deploy the app to an emulator/device and visually verify the YouTube-style dark theme, bottom navigation, and Instagram-style grid layout.
