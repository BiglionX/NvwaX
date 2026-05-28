import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "NvwaX - AI Agent & AiTeam 制造工厂";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 50%, #1a1a2e 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* 装饰圆环 */}
        <div
          style={{
            position: "absolute",
            top: "-200px",
            right: "-200px",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-150px",
            left: "-150px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
          }}
        />

        {/* Logo 区域 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "24px",
              background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "36px",
              fontWeight: "bold",
              color: "white",
              boxShadow: "0 8px 32px rgba(59,130,246,0.3)",
            }}
          >
            N
          </div>
          <div style={{ fontSize: "64px", fontWeight: 800, color: "white", letterSpacing: "-2px" }}>
            NvwaX
          </div>
        </div>

        {/* 标语 */}
        <div
          style={{
            fontSize: "28px",
            fontWeight: 600,
            color: "#94a3b8",
            textAlign: "center",
            letterSpacing: "2px",
          }}
        >
          AI Agent & AiTeam 制造工厂
        </div>

        {/* 底部标签行 */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            display: "flex",
            gap: "40px",
            fontSize: "18px",
            color: "#64748b",
            fontWeight: 500,
          }}
        >
          <span>搜索 · 发现 · 创建 · 发布</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
