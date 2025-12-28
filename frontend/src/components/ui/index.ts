/**
 * UI Components Index
 */

// Core Components
export { Button, buttonVariants } from './Button.js';
export { Input } from './Input.js';
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './Card.js';
export { Badge, badgeVariants } from './Badge.js';
export { Avatar } from './Avatar.js';
export { Progress } from './Progress.js';
export { Modal } from './Modal.js';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './Tabs.js';
export { Skeleton } from './Skeleton.js';
export { Alert, AlertTitle, AlertDescription } from './Alert.js';
export { EmptyState } from './EmptyState.js';
export { DataTable } from './DataTable.js';
export { VideoPlayer } from './VideoPlayer.js';
export { ToastContainer, ToastItem } from './Toast.js';

// New UI Components
export { LoadingSpinner, PageLoading, ButtonLoading } from './LoadingSpinner.js';
export { Textarea } from './Textarea.js';
export { Select, MultiSelect } from './Select.js';

// Typography Components
export {
  Text,
  textVariants,
  H1,
  H2,
  H3,
  H4,
  H5,
  H6,
  LinkText,
  linkVariants,
  Code,
  Paragraph,
  Label,
} from './Typography.js';
export type { TextProps, LinkTextProps, CodeProps, ParagraphProps, LabelProps } from './Typography.js';

// Layout Components
export {
  Stack,
  VStack,
  HStack,
  Grid,
  Box,
  Container,
  Divider,
  Spacer,
  AspectRatio,
} from './Layout.js';
export type {
  StackProps,
  GridProps,
  BoxProps,
  ContainerProps,
  DividerProps,
  SpacerProps,
  AspectRatioProps,
} from './Layout.js';

// Theme Components
export {
  ThemeProvider,
  useTheme,
  ThemeToggle,
  ThemeContext,
} from './ThemeProvider.js';
export type {
  Theme,
  ResolvedTheme,
  ThemeContextValue,
  ThemeProviderProps,
  ThemeToggleProps,
} from './ThemeProvider.js';

// Icon Components
export {
  Icon,
  iconVariants,
  IconBox,
  IconButton,
  iconCatalog,
} from './Icon.js';
export type { IconProps, IconBoxProps, IconButtonProps, LucideIcon } from './Icon.js';

// Form Components
export {
  Form,
  FormField,
  FormInput,
  FormTextarea,
  FormSelect,
  FormCheckbox,
  FormRadioGroup,
  FormSwitch,
  FormActions,
  FormErrorBanner,
  FormRow,
  FormSection,
  useFormContext,
} from './Form.js';

// Enhanced DataTable
export {
  EnhancedDataTable,
  RowActionMenu,
} from './EnhancedDataTable.js';
export type { TableColumn, TablePagination, TableSelection } from './EnhancedDataTable.js';

// Search & Filter
export {
  SearchInput,
  FilterBar,
  FilterChip,
  DateRangePicker,
} from './SearchFilter.js';

// Pagination & Infinite Scroll
export {
  Pagination,
  InfiniteScroll,
  ScrollToTop,
  LoadMoreButton,
  ScrollProgress,
  usePagination,
  useInfiniteScroll,
} from './Pagination.js';
