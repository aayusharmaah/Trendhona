// Shared mutable application state — imported by reference across all modules.
export const state = {
  currentUser:     null,   // Supabase User object
  userProfile:     null,   // row from public.profiles
  currentDomain:   'all',  // active directory tab
  selectedRole:    null,   // 'creator' | 'brand' (auth signup)
  obRole:          null,   // onboarding role selection
  dashPeriod:      30,     // dashboard analytics period (7 | 30 | 90)
  dashGrowthChart: null,   // Chart.js instance
  dashReachChart:  null,   // Chart.js instance
};
