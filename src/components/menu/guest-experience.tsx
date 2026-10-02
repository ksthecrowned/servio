"use client";

import {
  ArrowLeft,
  Baby,
  Bell,
  BellRing,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Droplets,
  FileQuestion,
  GlassWater,
  Home,
  Menu as MenuIcon,
  MessageCircleQuestion,
  MoreHorizontal,
  ReceiptText,
  Search,
  Send,
  Sparkles,
  TriangleAlert,
  Utensils,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { listTableOrders, type TableOrder } from "@/app/actions/orders";
import { listTableRequests, requestWaiterAssistance, type TableRequest } from "@/app/actions/waiter-requests";
import { requestDetail, requestPhase, requestTitle } from "@/lib/request-status";
import type { MenuItemForCart } from "@/components/menu/add-to-cart-dialog";
import {
  CartScreen,
  DishOrderPanel,
  GuestCartBar,
  isOrderInProgress,
  TableOrders,
} from "@/components/menu/guest-ordering";
import { formatCurrency } from "@/lib/currency";

type View = "home" | "menu" | "detail" | "cart" | "call" | "water" | "bill" | "other" | "question" | "requests";
type Dish = MenuItemForCart & { categoryName: string };
type Category = { id: string; name: string; menu_items: MenuItemForCart[] };

const TYPE_TITLE: Record<string, string> = {
  call_waiter: "Appeler un serveur",
  water: "Demander de l’eau",
  bill: "Demander l’addition",
  cutlery: "Demander des couverts",
  other: "Autre demande",
};

function formatPrice(price: number) {
  return formatCurrency(price);
}

function mark(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "S"
  );
}

function greeting() {
  return new Date().getHours() >= 18 ? "Bonsoir" : "Bonjour";
}

function tableLine(label?: string | null) {
  if (!label) return null;
  return /^table\b/i.test(label) ? label : `Table ${label}`;
}

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function Btn({
  children,
  onClick,
  variant = "primary",
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
}) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`btn btn-${variant}`}>
      {children}
    </button>
  );
}

export function GuestExperience({
  restaurant,
  categories,
  tableLabel,
  restaurantSlug,
  branchSlug,
  branchId,
  tableId,
  sessionOpenedAt,
}: {
  restaurant: { name: string; description: string | null; cuisine_type: string | null };
  categories: Category[];
  tableLabel?: string | null;
  restaurantSlug: string;
  branchSlug: string;
  branchId: string;
  tableId: string;
  sessionOpenedAt: string;
}) {
  const [view, setView] = useState<View>("home");
  const [dish, setDish] = useState<Dish | null>(null);
  const [requests, setRequests] = useState<TableRequest[]>([]);
  const [orders, setOrders] = useState<TableOrder[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const startedAt = clock(sessionOpenedAt);

  const dishes = useMemo(
    () => categories.flatMap((category) => category.menu_items.map((item) => ({ ...item, categoryName: category.name }))),
    [categories],
  );

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let cancel = false;
    const load = () => {
      void listTableRequests(branchId, tableId).then((rows) => {
        if (!cancel) setRequests(rows);
      });
      void listTableOrders(branchId, tableId).then((rows) => {
        if (!cancel) setOrders(rows);
      });
    };
    load();
    const timer = setInterval(load, 4000);
    return () => {
      cancel = true;
      clearInterval(timer);
    };
  }, [branchId, tableId]);

  const navigate = (next: View) => {
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activeCount =
    requests.filter((request) => !request.resolved_at).length + orders.filter(isOrderInProgress).length;

  async function send(type: string, title: string, note?: string) {
    if (requests.some((request) => !request.resolved_at && request.type === type && (request.note ?? "") === (note ?? ""))) {
      setToast("Cette demande est déjà en cours");
      navigate("requests");
      return;
    }
    const result = await requestWaiterAssistance(branchId, tableId, type, note);
    if (result.error) {
      setToast(result.error);
      return;
    }
    setRequests(await listTableRequests(branchId, tableId));
    setToast("Demande envoyée");
    navigate("requests");
    void title;
  }

  return (
    <>
      {toast ? (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          <span>{toast}</span>
        </div>
      ) : null}

      <header className="app-header">
        <button type="button" className="brand" onClick={() => navigate("home")}>
          <span className="brand-mark">{mark(restaurant.name)}</span>
          <span>
            <strong>{restaurant.name}</strong>
            <small>{tableLine(tableLabel) ?? "Table"} · Session active</small>
          </span>
        </button>
      </header>

      {view === "home" && (
        <HomeScreen
          restaurant={restaurant}
          tableLabel={tableLabel}
          dishCount={dishes.length}
          activeCount={activeCount}
          startedAt={startedAt}
          navigate={navigate}
        />
      )}
      {view === "menu" && (
        <MenuScreen
          restaurant={restaurant}
          tableLabel={tableLabel}
          categories={categories}
          dishes={dishes}
          openDish={(item) => {
            setDish(item);
            navigate("detail");
          }}
        />
      )}
      {view === "detail" && dish && (
        <DishDetail
          key={dish.id}
          dish={dish}
          back={() => navigate("menu")}
          ask={() => navigate("question")}
          added={() => {
            setToast("Ajouté au panier");
            navigate("menu");
          }}
        />
      )}
      {view === "call" && (
        <CallScreen
          active={requests.some((request) => request.type === "call_waiter" && !request.resolved_at)}
          confirm={() => void send("call_waiter", "Appeler un serveur")}
          menu={() => navigate("menu")}
          tableLabel={tableLabel}
        />
      )}
      {view === "water" && (
        <WaterScreen
          submit={(value) => void send("water", "Demander de l’eau", value)}
          menu={() => navigate("menu")}
          tableLabel={tableLabel}
        />
      )}
      {view === "bill" && (
        <BillScreen
          submit={() => void send("bill", "Demander l’addition")}
          menu={() => navigate("menu")}
          tableLabel={tableLabel}
        />
      )}
      {view === "other" && (
        <OtherScreen
          submit={(type, note) => void send(type, TYPE_TITLE[type] ?? "Autre demande", note)}
          menu={() => navigate("menu")}
          tableLabel={tableLabel}
        />
      )}
      {view === "question" && dish && (
        <QuestionScreen
          dish={dish}
          submit={(question) =>
            void send("other", "Question sur un plat", `Question sur un plat · ${dish.name} · ${question}`)
          }
          back={() => navigate("detail")}
          menu={() => navigate("menu")}
          tableLabel={tableLabel}
        />
      )}
      {view === "cart" && (
        <CartScreen
          restaurantSlug={restaurantSlug}
          branchSlug={branchSlug}
          tableId={tableId}
          menu={() => navigate("menu")}
        />
      )}
      {view === "requests" && (
        <RequestsScreen
          requests={requests}
          orders={orders}
          restaurantSlug={restaurantSlug}
          branchSlug={branchSlug}
          menu={() => navigate("menu")}
          tableLabel={tableLabel}
        />
      )}

      {["home", "menu", "requests"].includes(view) ? <GuestCartBar onOpen={() => navigate("cart")} /> : null}

      <nav className="bottom-nav" aria-label="Navigation principale">
        <button type="button" className={view === "home" ? "active" : ""} onClick={() => navigate("home")}>
          <Home size={21} />
          <span>Accueil</span>
        </button>
        <button
          type="button"
          className={view === "menu" || view === "detail" ? "active" : ""}
          onClick={() => navigate("menu")}
        >
          <UtensilsCrossed size={21} />
          <span>Menu</span>
        </button>
        <button
          type="button"
          className={["call", "water", "bill", "other", "question"].includes(view) ? "active" : ""}
          onClick={() => navigate("other")}
        >
          <Bell size={21} />
          <span>Service</span>
        </button>
        <button type="button" className={view === "requests" ? "active" : ""} onClick={() => navigate("requests")}>
          <span className="nav-icon">
            <Clock3 size={21} />
            {activeCount > 0 ? <b>{activeCount}</b> : null}
          </span>
          <span>Suivi</span>
        </button>
      </nav>
    </>
  );
}

function HomeScreen({
  restaurant,
  tableLabel,
  dishCount,
  activeCount,
  startedAt,
  navigate,
}: {
  restaurant: { name: string; description: string | null; cuisine_type: string | null };
  tableLabel?: string | null;
  dishCount: number;
  activeCount: number;
  startedAt: string;
  navigate: (view: View) => void;
}) {
  return (
    <div className="screen home-screen animate-in">
      <section className="welcome">
        <p className="eyebrow">
          {greeting()}
          {tableLine(tableLabel) ? ` · ${tableLine(tableLabel)}` : ""}
        </p>
        <h1>
          Bienvenue chez
          <br />
          {restaurant.name}
        </h1>
        <p>{restaurant.description || "Bienvenue à table. Prenez le temps de découvrir notre cuisine."}</p>
      </section>
      <button type="button" className="menu-feature" onClick={() => navigate("menu")}>
        <span>
          <small>LA CARTE</small>
          <strong>Découvrez le menu</strong>
          <em>
            {dishCount} création{dishCount > 1 ? "s" : ""}
            {restaurant.cuisine_type ? ` · ${restaurant.cuisine_type}` : ""}
          </em>
        </span>
        <span className="round-arrow">
          <ChevronRight />
        </span>
      </button>
      <section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">SERVICE À TABLE</p>
            <h2>Que souhaitez-vous ?</h2>
          </div>
          {activeCount > 0 ? (
            <button type="button" className="active-link" onClick={() => navigate("requests")}>
              <span>{activeCount}</span> en cours
            </button>
          ) : null}
        </div>
        <div className="action-grid">
          <Action icon={<BellRing />} label="Appeler un serveur" onClick={() => navigate("call")} />
          <Action icon={<GlassWater />} label="Demander de l’eau" onClick={() => navigate("water")} />
          <Action icon={<ReceiptText />} label="Demander l’addition" onClick={() => navigate("bill")} />
          <Action icon={<MoreHorizontal />} label="Autres demandes" onClick={() => navigate("other")} />
        </div>
      </section>
      <div className="session-note">
        <Clock3 size={17} />
        <span>Session ouverte à {startedAt}</span>
        <span className="status-dot" /> Active
      </div>
    </div>
  );
}

function Action({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" className="action-row" onClick={onClick}>
      <span className="action-icon">{icon}</span>
      <span>{label}</span>
      <ChevronRight size={18} />
    </button>
  );
}

function MenuScreen({
  restaurant,
  tableLabel,
  categories,
  dishes,
  openDish,
}: {
  restaurant: { name: string };
  tableLabel?: string | null;
  categories: Category[];
  dishes: Dish[];
  openDish: (dish: Dish) => void;
}) {
  const [category, setCategory] = useState("Tout");
  const [query, setQuery] = useState("");
  const shown = dishes.filter((item) => {
    const inCategory = category === "Tout" || item.categoryName === category;
    const needle = query.toLowerCase();
    return inCategory && `${item.name} ${item.description ?? ""}`.toLowerCase().includes(needle);
  });
  const featured = dishes.filter((item) => item.is_bestseller && item.is_available);

  return (
    <div className="screen menu-screen animate-in">
      <div className="menu-intro">
        <p className="eyebrow">
          {restaurant.name}
          {tableLine(tableLabel) ? ` · ${tableLine(tableLabel)}` : ""}
        </p>
        <h1>Le menu</h1>
        <p>Une cuisine à parcourir depuis votre table.</p>
      </div>
      <label className="search-box">
        <Search size={20} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher un plat, un ingrédient…"
          aria-label="Rechercher dans le menu"
        />
        {query ? (
          <button type="button" onClick={() => setQuery("")} aria-label="Effacer la recherche">
            <X size={18} />
          </button>
        ) : null}
      </label>
      <div className="category-strip">
        <button type="button" className={category === "Tout" ? "active" : ""} onClick={() => setCategory("Tout")}>
          Tout
        </button>
        {categories.map((item) => (
          <button
            key={item.id}
            type="button"
            className={category === item.name ? "active" : ""}
            onClick={() => setCategory(item.name)}
          >
            {item.name}
          </button>
        ))}
      </div>
      {!query && category === "Tout" && featured.length > 0 ? (
        <section>
          <div className="section-heading">
            <div>
              <p className="eyebrow">SÉLECTION</p>
              <h2>À découvrir</h2>
            </div>
          </div>
          <div className="featured-scroll">
            {featured.map((item) => (
              <button key={item.id} type="button" className="featured-dish" onClick={() => openDish(item)}>
                {item.image_url ? <img src={item.image_url} alt={item.name} /> : <span className="dish-photo" />}
                <span className="image-label">Recommandé</span>
                <span className="featured-caption">
                  <strong>{item.name}</strong>
                  <em>{formatPrice(item.base_price)}</em>
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
      <section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">{query ? `${shown.length} résultat${shown.length > 1 ? "s" : ""}` : category}</p>
            <h2>{query ? `Recherche « ${query} »` : category === "Tout" ? "Toute la carte" : category}</h2>
          </div>
        </div>
        {shown.length ? (
          <div className="dish-list">
            {shown.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`dish-row ${item.is_available ? "" : "unavailable"}`}
                onClick={() => item.is_available && openDish(item)}
              >
                {item.image_url ? <img src={item.image_url} alt="" /> : <span className="dish-photo-thumb" />}
                <span className="dish-copy">
                  {item.is_bestseller ? <small>Recommandé</small> : null}
                  <strong>{item.name}</strong>
                  {item.description ? <em>{item.description}</em> : null}
                  <b>{item.is_available ? formatPrice(item.base_price) : "Indisponible"}</b>
                </span>
                <ChevronRight size={18} />
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>Aucun résultat</h3>
            <p>Essayez un autre nom ou parcourez nos catégories.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function DishDetail({
  dish,
  back,
  ask,
  added,
}: {
  dish: Dish;
  back: () => void;
  ask: () => void;
  added: () => void;
}) {
  return (
    <div className="dish-detail animate-in">
      <div className="detail-image">
        {dish.image_url ? <img src={dish.image_url} alt={dish.name} /> : <span className="dish-photo" />}
        <button type="button" className="floating-back" onClick={back} aria-label="Retour au menu">
          <ArrowLeft />
        </button>
        {dish.is_bestseller ? <span className="image-label">Recommandé</span> : null}
      </div>
      <div className="detail-body">
        <p className="eyebrow">{dish.categoryName}</p>
        <h1>{dish.name}</h1>
        <div className="detail-price">
          <strong>{formatPrice(dish.base_price)}</strong>
          <span className={`status-badge ${dish.is_available ? "success" : "pending"}`}>
            {dish.is_available ? "Disponible" : "Indisponible"}
          </span>
        </div>
        {dish.description ? <p className="lead">{dish.description}</p> : null}
        {dish.is_available ? <DishOrderPanel dish={dish} onAdded={added} /> : null}
        <div className="detail-actions">
          <Btn variant="secondary" onClick={ask}>
            <MessageCircleQuestion size={19} /> Poser une question au serveur
          </Btn>
          <Btn variant="ghost" onClick={back}>
            <MenuIcon size={19} /> Retour au menu
          </Btn>
        </div>
      </div>
    </div>
  );
}

function ServiceLayout({
  icon,
  title,
  copy,
  children,
  menu,
  tableLabel,
}: {
  icon: ReactNode;
  title: string;
  copy: string;
  children: ReactNode;
  menu: () => void;
  tableLabel?: string | null;
}) {
  return (
    <div className="screen service-screen animate-in">
      <div className="service-icon">{icon}</div>
      <p className="eyebrow">{tableLine(tableLabel)?.toUpperCase() ?? "TABLE"}</p>
      <h1>{title}</h1>
      <p className="service-copy">{copy}</p>
      {children}
      <Btn variant="ghost" onClick={menu}>
        <MenuIcon size={19} /> Retour au menu
      </Btn>
    </div>
  );
}

function CallScreen({
  active,
  confirm,
  menu,
  tableLabel,
}: {
  active: boolean;
  confirm: () => void;
  menu: () => void;
  tableLabel?: string | null;
}) {
  return (
    <ServiceLayout
      icon={active ? <BellRing /> : <Bell />}
      title={active ? "Serveur déjà prévenu" : "Appeler un serveur"}
      copy={active ? "Votre demande est actuellement en cours de traitement." : "Un serveur va venir à votre table."}
      menu={menu}
      tableLabel={tableLabel}
    >
      {active ? (
        <div className="info-band">
          <Clock3 /> Demande en cours
        </div>
      ) : (
        <Btn onClick={confirm}>
          <BellRing size={19} /> Confirmer l’appel
        </Btn>
      )}
    </ServiceLayout>
  );
}

function WaterScreen({
  submit,
  menu,
  tableLabel,
}: {
  submit: (value: string) => void;
  menu: () => void;
  tableLabel?: string | null;
}) {
  const [value, setValue] = useState("Eau plate");
  return (
    <ServiceLayout
      icon={<GlassWater />}
      title="Demander de l’eau"
      copy="Précisez votre préférence pour aider notre équipe."
      menu={menu}
      tableLabel={tableLabel}
    >
      <div className="choice-list">
        {["Eau plate", "Eau gazeuse", "Peu importe"].map((option) => (
          <button
            key={option}
            type="button"
            className={value === option ? "selected" : ""}
            onClick={() => setValue(option)}
          >
            <span>{option}</span>
            <span className="radio">{value === option ? <Check size={16} /> : null}</span>
          </button>
        ))}
      </div>
      <Btn onClick={() => submit(value)}>
        <Send size={19} /> Envoyer la demande
      </Btn>
    </ServiceLayout>
  );
}

function BillScreen({
  submit,
  menu,
  tableLabel,
}: {
  submit: () => void;
  menu: () => void;
  tableLabel?: string | null;
}) {
  return (
    <ServiceLayout
      icon={<ReceiptText />}
      title="Demander l’addition"
      copy="Souhaitez-vous demander l’addition à votre serveur ?"
      menu={menu}
      tableLabel={tableLabel}
    >
      <div className="quiet-card">
        <ReceiptText />
        <span>
          <strong>Règlement à table</strong>
          <small>Votre serveur viendra vous voir.</small>
        </span>
      </div>
      <Btn onClick={submit}>Demander l’addition</Btn>
    </ServiceLayout>
  );
}

function OtherScreen({
  submit,
  menu,
  tableLabel,
}: {
  submit: (type: string, note?: string) => void;
  menu: () => void;
  tableLabel?: string | null;
}) {
  const [selected, setSelected] = useState("");
  const [note, setNote] = useState("");
  const options = [
    { name: "Demander des couverts", type: "cutlery", icon: <Utensils /> },
    { name: "Demander une chaise bébé", type: "other", icon: <Baby /> },
    { name: "Signaler un problème", type: "other", icon: <TriangleAlert /> },
    { name: "Autre demande", type: "other", icon: <MoreHorizontal /> },
  ];
  const current = options.find((option) => option.name === selected);

  return (
    <ServiceLayout
      icon={<Sparkles />}
      title="Autres demandes"
      copy="Comment pouvons-nous rendre votre moment plus agréable ?"
      menu={menu}
      tableLabel={tableLabel}
    >
      <div className="other-list">
        {options.map((option) => (
          <button
            key={option.name}
            type="button"
            className={selected === option.name ? "selected" : ""}
            onClick={() => setSelected(option.name)}
          >
            {option.icon}
            <span>{option.name}</span>
            <ChevronRight size={18} />
          </button>
        ))}
      </div>
      {selected ? (
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={selected === "Autre demande" ? "Décrivez votre demande…" : "Ajouter une précision (facultatif)"}
          aria-label="Précision de la demande"
        />
      ) : null}
      <Btn
        disabled={!current || (selected === "Autre demande" && !note.trim())}
        onClick={() => current && submit(current.type, [current.name, note.trim()].filter(Boolean).join(" · "))}
      >
        <Send size={19} /> Envoyer
      </Btn>
    </ServiceLayout>
  );
}

function QuestionScreen({
  dish,
  submit,
  back,
  menu,
  tableLabel,
}: {
  dish: Dish;
  submit: (question: string) => void;
  back: () => void;
  menu: () => void;
  tableLabel?: string | null;
}) {
  const [question, setQuestion] = useState("");
  return (
    <ServiceLayout
      icon={<MessageCircleQuestion />}
      title="Une question sur ce plat ?"
      copy={dish.name}
      menu={menu}
      tableLabel={tableLabel}
    >
      <button type="button" className="mini-dish" onClick={back}>
        {dish.image_url ? <img src={dish.image_url} alt="" /> : <span className="dish-photo-thumb" />}
        <span>
          <strong>{dish.name}</strong>
          <small>{formatPrice(dish.base_price)}</small>
        </span>
      </button>
      <label className="field-label">
        Votre question
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ex. : Est-il possible de retirer les produits laitiers ?"
        />
      </label>
      <Btn disabled={!question.trim()} onClick={() => submit(question.trim())}>
        <Send size={19} /> Envoyer la question
      </Btn>
    </ServiceLayout>
  );
}

function RequestsScreen({
  requests,
  orders,
  restaurantSlug,
  branchSlug,
  menu,
  tableLabel,
}: {
  requests: TableRequest[];
  orders: TableOrder[];
  restaurantSlug: string;
  branchSlug: string;
  menu: () => void;
  tableLabel?: string | null;
}) {
  return (
    <div className="screen requests-screen animate-in">
      <div className="page-heading">
        <p className="eyebrow">SESSION{tableLine(tableLabel) ? ` · ${tableLine(tableLabel)?.toUpperCase()}` : ""}</p>
        <h1>Mon suivi</h1>
        <p>Suivez vos commandes et vos demandes pendant le repas.</p>
      </div>
      <TableOrders orders={orders} restaurantSlug={restaurantSlug} branchSlug={branchSlug} />
      <div className="requests-list">
        {requests.length > 0 && orders.length > 0 ? <h2 className="list-title">Mes demandes</h2> : null}
        {requests.length ? (
          requests.map((request) => {
            const title = requestTitle(request.type, request.note);
            const detail = requestDetail(request.note);
            const phase = requestPhase(request);
            const step = phase === "done" ? 2 : phase === "active" ? 1 : 0;
            return (
              <article className="request-item" key={request.id}>
                <div className="request-top">
                  <span className="request-icon">
                    {request.type === "water" ? (
                      <Droplets size={18} />
                    ) : request.type === "bill" ? (
                      <ReceiptText size={18} />
                    ) : title.startsWith("Question") ? (
                      <MessageCircleQuestion size={18} />
                    ) : (
                      <Bell size={18} />
                    )}
                  </span>
                  <span>
                    <strong>{title}</strong>
                    {detail ? <small>{detail}</small> : null}
                    <em>{clock(request.created_at)}</em>
                  </span>
                  <span className={`status-badge ${phase === "done" ? "success" : phase === "active" ? "active" : "pending"}`}>
                    {phase === "done" ? "Terminée" : phase === "active" ? "Prise en charge" : "En attente"}
                  </span>
                </div>
                <div className="timeline">
                  {["Envoyée", "Prise en charge", "Terminée"].map((label, index) => {
                    const reached = index <= step;
                    return (
                      <div className={reached ? "done" : ""} key={label}>
                        <span>{reached ? <Check size={10} /> : null}</span>
                        <small>{label}</small>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <h3>Rien pour l’instant</h3>
            <p>Vos commandes et demandes de service apparaîtront ici.</p>
          </div>
        ) : null}
      </div>
      <Btn variant="secondary" onClick={menu}>
        <MenuIcon size={19} /> Voir le menu
      </Btn>
    </div>
  );
}
