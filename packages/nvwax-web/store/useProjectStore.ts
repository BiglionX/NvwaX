import { create } from 'zustand';
import { Project, AiTeam, AgentTeam } from '@/lib/api/projects';

interface ProjectState {
  currentProject: Project | null;
  currentTeam: AiTeam | null;
  currentAgentTeam: AgentTeam | null;
  setCurrentProject: (project: Project | null) => void;
  setCurrentTeam: (team: AiTeam | null) => void;
  setCurrentAgentTeam: (agentTeam: AgentTeam | null) => void;
  clearCurrentState: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentProject: null,
  currentTeam: null,
  currentAgentTeam: null,
  setCurrentProject: (project) => set({ currentProject: project }),
  setCurrentTeam: (team) => set({ currentTeam: team }),
  setCurrentAgentTeam: (agentTeam) => set({ currentAgentTeam: agentTeam }),
  clearCurrentState: () => set({ currentProject: null, currentTeam: null, currentAgentTeam: null })
}));
