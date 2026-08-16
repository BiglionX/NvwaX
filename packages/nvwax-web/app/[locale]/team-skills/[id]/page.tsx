import type { Metadata } from "next";
import TeamSkillDetailView from "./TeamSkillDetailView";
import JsonLd from "@/components/JsonLd";
import {
  absoluteUrl,
  alternatesFor,
  breadcrumbJsonLd,
  getApiBaseUrl,
} from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

const DEFAULT_DESC_EN =
  "Explore this AI Team Skill on NvwaX: team roles, workflow steps, and collaboration rules you can apply to your own AI projects.";
const DEFAULT_DESC_ZH =
  "查看 NvwaX 上的 AI 团队技能：包含团队角色、工作流步骤与协作规则，可一键应用到您自己的 AI 项目。";

/** 服务端获取公开的 Team Skill 详情（失败时降级为通用元数据） */
async function fetchSkill(id: string) {
  try {
    const res = await fetch(`${getApiBaseUrl()}/team-skills/${id}`, {
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body?.data || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const isEn = locale === "en";
  const skill = await fetchSkill(id);
  const name = skill?.name;
  const description =
    skill?.description || (isEn ? DEFAULT_DESC_EN : DEFAULT_DESC_ZH);

  return {
    title: name || (isEn ? "Team Skill Detail - NvwaX" : "Team Skill 详情 - NvwaX"),
    description,
    openGraph: {
      title: name || (isEn ? "NvwaX Team Skill" : "NvwaX Team Skill"),
      description,
    },
    alternates: alternatesFor(`/team-skills/${id}`, locale),
  };
}

export default async function TeamSkillDetailPage({ params }: Props) {
  const { locale, id } = await params;

  return (
    <>
      {/* 面包屑结构化数据（SEO/GEO） */}
      <JsonLd
        data={breadcrumbJsonLd([
          {
            name: locale === "en" ? "Team Skills" : "Team Skills 市场",
            url: absoluteUrl("/team-skills", locale),
          },
          {
            name: "Team Skill",
            url: absoluteUrl(`/team-skills/${id}`, locale),
          },
        ])}
      />
      <TeamSkillDetailView />
    </>
  );
}
