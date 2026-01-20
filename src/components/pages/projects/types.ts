export type ProjectDetails = {
  titleA: string;
  itemsA: string[];
  titleB: string;
  itemsB: string[];
};

export type Project = {
  id: string;
  name: string;
  glb: string;
  guide: string;
  bom: string;
  date: string;
  modelPath?: string;
  details: ProjectDetails;
};
