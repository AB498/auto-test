import NewOrderForm from "@/components/NewOrderForm";

export default async function NewOrderPage({ searchParams }: PageProps<"/orders/new">) {
  // QA helper: /orders/new?fault=table_full forwards a simulated DB fault to the API.
  const { fault } = await searchParams;

  return (
    <>
      <h1>New order</h1>
      <NewOrderForm simulateFault={typeof fault === "string" ? fault : undefined} />
    </>
  );
}
