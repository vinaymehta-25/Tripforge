def create_account(client, full_name, email):
    response = client.post("/api/auth/register", json={
        "full_name": full_name, "email": email, "password": "safe-demo-password",
    })
    assert response.status_code == 201
    payload = response.json()
    return {"Authorization": "Bearer " + payload["access_token"]}, payload["user"]


def create_trip(client, headers):
    response = client.post("/api/trips", headers=headers, json={
        "title": "A long weekend away", "destination_name": "Lisbon",
        "starts_on": "2027-04-10", "ends_on": "2027-04-12",
        "travelers": 2, "budget": 1500, "currency": "USD",
        "notes": "Take the slow train.", "cover_image_url": "https://example.com/lisbon.jpg",
    })
    assert response.status_code == 201
    return response.json()


def test_registration_trip_itinerary_and_budget(client):
    headers, _ = create_account(client, "Jamie Rivera", "jamie@example.com")
    trip = create_trip(client, headers)
    detail = client.get("/api/trips/" + str(trip["id"]), headers=headers)
    assert detail.status_code == 200
    assert detail.json()["role"] == "owner"
    assert len(detail.json()["days"]) == 3
    shifted = client.patch(f"/api/trips/{trip['id']}", headers=headers, json={
        "starts_on": "2027-04-11", "ends_on": "2027-04-13",
    })
    assert shifted.status_code == 200
    detail = client.get("/api/trips/" + str(trip["id"]), headers=headers)
    assert detail.json()["days"][0]["day_date"] == "2027-04-11"
    assert detail.json()["days"][-1]["day_date"] == "2027-04-13"

    day = detail.json()["days"][0]
    added = client.post(
        f"/api/trips/{trip['id']}/days/{day['id']}/activities",
        headers=headers,
        json={"title": "Coffee in Alfama", "location": "Alfama", "start_time": "09:30", "category": "food", "cost": 12},
    )
    assert added.status_code == 201
    assert added.json()["days"][0]["activities"][0]["title"] == "Coffee in Alfama"

    expense = client.post(
        f"/api/trips/{trip['id']}/expenses",
        headers=headers,
        json={"title": "Train tickets", "category": "transport", "amount": 80, "spent_on": "2027-04-10"},
    )
    assert expense.status_code == 201
    changed = client.patch(
        f"/api/trips/{trip['id']}/expenses/{expense.json()['id']}",
        headers=headers,
        json={"amount": 95},
    )
    assert changed.status_code == 200
    assert float(changed.json()["amount"]) == 95


def test_invitation_enforces_viewer_access(client):
    owner_headers, _ = create_account(client, "Taylor Owner", "owner@example.com")
    trip = create_trip(client, owner_headers)
    invite = client.post(
        f"/api/trips/{trip['id']}/members",
        headers=owner_headers,
        json={"email": "guest@example.com", "role": "viewer"},
    )
    assert invite.status_code == 201
    token = invite.json()["invite_url"].rsplit("/", 1)[1]
    guest_headers, _ = create_account(client, "Guest Viewer", "guest@example.com")
    pending = client.get("/api/auth/invitations", headers=guest_headers)
    assert pending.status_code == 200
    assert len(pending.json()) == 1
    accepted = client.post("/api/auth/invitations/accept", headers=guest_headers, json={"token": token})
    assert accepted.status_code == 200

    detail = client.get(f"/api/trips/{trip['id']}", headers=guest_headers)
    assert detail.status_code == 200
    assert detail.json()["role"] == "viewer"
    denied = client.post(
        f"/api/trips/{trip['id']}/expenses",
        headers=guest_headers,
        json={"title": "Unapproved change", "amount": 10, "spent_on": "2027-04-10"},
    )
    assert denied.status_code == 403


def test_private_trip_is_not_discoverable_by_another_account(client):
    owner_headers, _ = create_account(client, "Private Owner", "private@example.com")
    guest_headers, _ = create_account(client, "Another Person", "another@example.com")
    trip = create_trip(client, owner_headers)
    response = client.get(f"/api/trips/{trip['id']}", headers=guest_headers)
    assert response.status_code == 404


def test_editor_can_change_trip_but_cannot_manage_sharing(client):
    owner_headers, _ = create_account(client, "Owner Person", "owner-two@example.com")
    editor_headers, _ = create_account(client, "Editor Person", "editor@example.com")
    trip = create_trip(client, owner_headers)
    invite = client.post(
        f"/api/trips/{trip['id']}/members",
        headers=owner_headers,
        json={"email": "editor@example.com", "role": "editor"},
    )
    token = invite.json()["invite_url"].rsplit("/", 1)[1]
    assert client.post("/api/auth/invitations/accept", headers=editor_headers, json={"token": token}).status_code == 200

    changed = client.patch(f"/api/trips/{trip['id']}", headers=editor_headers, json={"title": "Edited together"})
    assert changed.status_code == 200
    assert changed.json()["title"] == "Edited together"
    denied = client.post(
        f"/api/trips/{trip['id']}/members",
        headers=editor_headers,
        json={"email": "another@example.com", "role": "viewer"},
    )
    assert denied.status_code == 403

    owner_headers2, _ = create_account(client, "Not this owner", "pending@example.com")
    assert owner_headers2
    pending = client.post(
        f"/api/trips/{trip['id']}/members",
        headers=owner_headers,
        json={"email": "pending@example.com", "role": "viewer"},
    )
    assert pending.status_code == 201
    members = client.get(f"/api/trips/{trip['id']}/members", headers=editor_headers).json()
    assert next(member for member in members if member["email"] == "pending@example.com")["invite_url"] is None


def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
