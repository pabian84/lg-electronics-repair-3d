import { ProjectsFrame } from "@/components/pages/projects";

type ProjectsProps = {
  onOpenEditor: (modelPath?: string) => void;
};

export default function Projects({ onOpenEditor }: ProjectsProps) {
  return <ProjectsFrame onOpenEditor={onOpenEditor} />;
}
