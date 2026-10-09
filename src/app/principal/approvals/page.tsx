"use client";

import { PortalShell, PRINCIPAL_NAV } from "@/components/layout/PortalShell";
import { useData } from "@/components/providers/DataProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Table, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate, labelize } from "@/lib/utils";

export default function PrincipalApprovalsPage() {
  const { data, approveLeave, rejectLeave, updateAdmissionStatus } = useData();
  const pendingLeaves = data.leaves.filter((l) => l.status === "pending");
  const admissionQueue = data.admissions.filter(
    (a) =>
      a.status === "inquiry" ||
      a.status === "applied" ||
      a.status === "under_review" ||
      a.status === "approved",
  );

  return (
    <PortalShell title="Principal Portal" subtitle="School leadership" nav={PRINCIPAL_NAV}>
      <PageHeader title="Approvals" subtitle="Staff leave and admission decisions" />

      <Card className="mb-6">
        <CardHeader title="Leave requests" description="Approve or reject staff leave" />
        <Table headers={["Staff", "From", "To", "Days", "Type", "Actions"]}>
          {pendingLeaves.map((l) => (
            <tr key={l.id}>
              <Td className="font-medium">{l.staffName}</Td>
              <Td>{formatDate(l.from)}</Td>
              <Td>{formatDate(l.to)}</Td>
              <Td>{l.days}</Td>
              <Td>{labelize(l.type)}</Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" onClick={() => approveLeave(l.id)}>
                    Approve
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => rejectLeave(l.id)}>
                    Reject
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
        {!pendingLeaves.length ? (
          <p className="p-8 text-center text-sm text-[var(--ims-text-muted)]">
            No pending leave requests
          </p>
        ) : null}
      </Card>

      <Card>
        <CardHeader title="Admissions queue" description="Advance or reject applications" />
        <Table headers={["Applicant", "Class", "Phone", "Status", "Actions"]}>
          {admissionQueue.map((a) => (
            <tr key={a.id}>
              <Td className="font-medium">{a.applicantName}</Td>
              <Td>{a.applyingFor}</Td>
              <Td>{a.phone}</Td>
              <Td>
                <Badge status={a.status === "approved" ? "paid" : "pending"}>
                  {labelize(a.status)}
                </Badge>
              </Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  {a.status !== "approved" ? (
                    <Button size="sm" onClick={() => updateAdmissionStatus(a.id, "approved")}>
                      Approve
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => updateAdmissionStatus(a.id, "rejected")}
                  >
                    Reject
                  </Button>
                  {a.status === "inquiry" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => updateAdmissionStatus(a.id, "under_review")}
                    >
                      Review
                    </Button>
                  ) : null}
                </div>
              </Td>
            </tr>
          ))}
        </Table>
        {!admissionQueue.length ? (
          <p className="p-8 text-center text-sm text-[var(--ims-text-muted)]">
            No admissions in queue
          </p>
        ) : null}
      </Card>
    </PortalShell>
  );
}
