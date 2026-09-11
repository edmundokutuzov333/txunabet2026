
'use client'
import { getDepartment, getDepartmentMembers, getDepartmentProjects } from "@/lib/data";
import DepartmentPageLayout from "../_components/department-layout";

const departmentSlug = "operations";
const department = getDepartment(departmentSlug);
const members = getDepartmentMembers(department?.name || "");
const projects = getDepartmentProjects(department?.name || "");

export default function OperationsPage() {
  if (!department) return <div>Departamento não encontrado.</div>

  return (
    <DepartmentPageLayout department={department} members={members} projects={projects} />
  );
}
