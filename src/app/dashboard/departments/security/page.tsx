
'use client'
import { getDepartment, getDepartmentMembers, getDepartmentProjects } from "@/lib/data";
import DepartmentPageLayout from "../_components/department-layout";

const departmentSlug = "security";
const department = getDepartment(departmentSlug);
const members = getDepartmentMembers(department?.name || "");
const projects = getDepartmentProjects(department?.name || "");

export default function SecurityDepartmentPage() {
  if (!department) return (
    <div className="p-6">
        <h1 className="text-2xl font-bold">Departamento não encontrado</h1>
        <p className="text-muted-foreground">O departamento que procura não existe.</p>
    </div>
  )

  return (
    <DepartmentPageLayout department={department} members={members} projects={projects} />
  );
}
