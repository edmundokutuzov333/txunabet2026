import DepartmentPageLayout from '../_components/department-layout';

export default async function DepartmentDynamicPage({ params }: { params: Promise<{ department: string }> }) {
  const { department } = await params;
  return <DepartmentPageLayout slug={department} />;
}
