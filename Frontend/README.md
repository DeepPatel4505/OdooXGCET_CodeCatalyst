# Dayflow HRMS - Frontend

A modern, responsive HRMS (Human Resource Management System) frontend built with React, Tailwind CSS, and shadcn UI components.

## Features

- 🎨 Modern, clean UI with Tailwind CSS and shadcn UI
- 📱 Fully responsive design (mobile-first)
- 🔐 JWT-based authentication with token refresh
- 👥 Employee management
- ⏰ Attendance tracking
- 📅 Leave management
- 💰 Payroll and payslip management
- 🎯 Role-based access control
- 📊 Dashboard with key metrics
- 🧪 Mock API support for development

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **shadcn UI** - Component library
- **React Router v6** - Routing
- **Zustand** - State management
- **React Hook Form + Zod** - Form handling and validation
- **Axios** - HTTP client
- **Sonner** - Toast notifications
- **Lucide React** - Icons
- **Day.js** - Date formatting

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### Installation

1. Clone the repository and navigate to the Frontend directory:
```bash
cd Frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the Frontend directory:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_USE_MOCK=true
VITE_APP_NAME=Dayflow HRMS
```

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Build

Build for production:
```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

Preview the production build:
```bash
npm run preview
```

### Linting

Run ESLint:
```bash
npm run lint
```

## Project Structure

```
Frontend/
├── src/
│   ├── components/          # Reusable components
│   │   ├── ui/              # shadcn UI components
│   │   ├── DataTable.jsx     # Reusable data table
│   │   ├── Layout.jsx       # Main layout wrapper
│   │   ├── LeftNav.jsx      # Sidebar navigation
│   │   ├── Topbar.jsx       # Top navigation bar
│   │   ├── ProtectedRoute.jsx # Route protection
│   │   └── PayslipViewer.jsx # Payslip display component
│   ├── pages/               # Page components
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Employees.jsx
│   │   ├── Attendance.jsx
│   │   ├── Leaves.jsx
│   │   ├── Payroll.jsx
│   │   ├── Payslips.jsx
│   │   ├── Settings.jsx
│   │   ├── Profile.jsx
│   │   └── NotFound.jsx
│   ├── lib/                 # Utility libraries
│   │   ├── api.js          # Axios client with interceptors
│   │   ├── auth.js         # Auth helpers
│   │   ├── format.js       # Formatting utilities
│   │   └── utils.js        # General utilities
│   ├── store/              # Zustand stores
│   │   └── auth.js         # Auth store
│   ├── mocks/              # Mock API responses
│   │   └── index.js        # Mock API functions
│   ├── App.jsx             # Main app component
│   ├── main.jsx            # Entry point
│   └── index.css           # Global styles
├── public/                 # Static assets
├── .env.example           # Environment variables example
├── package.json
├── vite.config.js
├── tailwind.config.cjs
├── postcss.config.cjs
├── .eslintrc.cjs
└── README.md
```

## Mock API Mode

When `VITE_USE_MOCK=true`, the application uses mock API responses for development. This allows you to develop and test the frontend without a backend.

**Test Accounts (All roles use password: `password123`):**

1. **Admin Account**
   - Email: `admin@Dayflow.com`
   - Password: `password123`
   - Role: Administrator
   - Full access to all features

2. **HR Account**
   - Email: `hr@Dayflow.com`
   - Password: `password123`
   - Role: HR Manager
   - Access to HR management features

3. **Manager Account**
   - Email: `manager@Dayflow.com`
   - Password: `password123`
   - Role: Manager
   - Access to team management features

4. **Employee Account**
   - Email: `employee@Dayflow.com`
   - Password: `password123`
   - Role: Employee
   - Basic employee access

## Backend Integration

The backend API contract is defined in `src/backend-integration.json`. This file contains:

- All API endpoints
- Request/response schemas
- Authentication requirements
- Error response formats

### API Base URL

Set `VITE_API_BASE_URL` in your `.env` file to point to your backend API.

### Authentication

The application uses JWT Bearer tokens. Tokens are automatically:
- Added to request headers
- Refreshed when expired
- Stored in localStorage

## Pages and Routes

- `/login` - Login page
- `/dashboard` - Dashboard with metrics
- `/employees` - Employee management
- `/attendance` - Attendance tracking
- `/leaves` - Leave management
- `/payroll` - Payroll and payrun management
- `/payslips` - Payslip viewing and download
- `/settings` - Payroll settings (admin/hr only)
- `/profile` - User profile management
- `/*` - 404 Not Found page

## Role-Based Access

The application supports role-based access control:

- **admin** - Full access
- **hr** - HR management access
- **manager** - Team management access
- **employee** - Basic employee access

Routes and features are protected based on user roles.

## Components

### Reusable Components

- **DataTable** - Searchable, paginated data table
- **PayslipViewer** - Printable payslip display
- **ProtectedRoute** - Route protection wrapper

### UI Components (shadcn)

- Button
- Card
- Dialog
- Input
- Label
- Select
- Table
- Dropdown Menu
- Skeleton

## Styling

The application uses Tailwind CSS with:
- Custom color scheme via CSS variables
- Responsive breakpoints (sm, md, lg, xl)
- Rounded corners (2xl)
- Subtle shadows
- Consistent spacing

## Form Validation

Forms use React Hook Form with Zod validation:
- Client-side validation
- Error messages
- Accessibility support

## State Management

- **Zustand** for global state (auth)
- **React Context** available for app-wide state
- Local component state for UI state

## Development Tips

1. **Mock Mode**: Use `VITE_USE_MOCK=true` for frontend-only development
2. **Hot Reload**: Vite provides fast HMR (Hot Module Replacement)
3. **Linting**: Run `npm run lint` before committing
4. **Type Safety**: Use JSDoc comments for better IDE support

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

This project is part of the Dayflow HRMS application.

## Backend Integration Tracking

The project includes a comprehensive backend integration tracking system to keep frontend and backend synchronized.

### Integration Files

- **`src/backendIntegration.js`** - Main integration specification (source of truth)
  - Contains all API endpoint definitions
  - Domain type definitions
  - API client factory
  - Environment configuration helpers

- **`src/backend-integration.json`** - Machine-readable API contract
  - Generated from `backendIntegration.js`
  - Used by backend team and CI validation
  - Auto-generated, do not edit manually

- **`src/integration-tracker.md`** - Human-readable integration tracker
  - Status of all endpoints (implemented/mocked/missing)
  - Sample requests and responses
  - Authentication and authorization details
  - Backend TODO list
  - Changelog

### Integration Scripts

```bash
# Generate backend-integration.json from backendIntegration.js
npm run sync-spec

# Validate that all API calls in frontend exist in the spec
npm run validate-spec
```

### Adding New Endpoints

1. **Update `src/backendIntegration.js`**
   - Add endpoint definition to `backendIntegrationSpec.endpoints`
   - Include method, path, description, request/response schemas
   - Mark `usedIn` files and `mockStatus`

2. **Regenerate JSON spec**
   ```bash
   npm run sync-spec
   ```

3. **Update mock handlers** (if needed)
   - Add mock implementation in `src/mocks/index.js`

4. **Update integration tracker**
   - Add endpoint to `src/integration-tracker.md`
   - Update status table

5. **Validate**
   ```bash
   npm run validate-spec
   ```

### Integration Workflow

1. **Frontend Development**
   - Use mock mode (`VITE_USE_MOCK=true`) for development
   - All API calls should be defined in the integration spec

2. **Backend Implementation**
   - Backend team implements endpoints based on `backend-integration.json`
   - Follow exact request/response formats specified

3. **Integration Testing**
   - Set `VITE_USE_MOCK=false` when backend is ready
   - Test all endpoints with the frontend
   - Update status in `integration-tracker.md`

4. **Version Control**
   - Increment version in `backendIntegrationSpec.meta.version`
   - Add changelog entry in `integration-tracker.md`

### Current Status

- **Total Endpoints:** 25
- **Mocked:** 25
- **Implemented:** 0 (pending backend)
- **Missing:** 0

See `src/integration-tracker.md` for detailed status of each endpoint.

## Support

For issues and questions, please refer to the project documentation or contact the development team.

