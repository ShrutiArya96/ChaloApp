function initMap() {
    const map = new google.maps.Map(document.getElementById("map"), {
      mapTypeControl: false,
      center: { lat: -33.8688, lng: 151.2195 },
      zoom: 13,
    });

    let routes = localStorage.getItem('googleMapRoutes');
    if(!routes) {
        routes = JSON.stringify([]); 
        localStorage.setItem('googleMapRoutes', routes);
    }
    new routeCreator(map);
}

class routeCreator {
    map;
    route;
    directionsService;
    directionsRenderer;
    constructor(map) {
        this.map = map;
        this.route = {
            originPlace: '',
            destinationPlace: "",
            wayPointStops: [],
        };
        this.directionsService = new google.maps.DirectionsService();
        this.directionsRenderer = new google.maps.DirectionsRenderer();
        this.directionsRenderer.setMap(map);

        const originInput = document.getElementById("origin-input");
        const destinationInput = document.getElementById("destination-input");

        const addStop = document.getElementById("addStop");
        addStop.addEventListener('click', this.addWayPoint.bind(this));

        const showRoute = document.getElementById("addRoute");
        showRoute.addEventListener('click', this.addRoute.bind(this, null));

        const originAutocomplete = new google.maps.places.Autocomplete(originInput);
        const destinationAutocomplete = new google.maps.places.Autocomplete(destinationInput);

        this.setupPlaceChangedListener(originAutocomplete, "ORIG");
        this.setupPlaceChangedListener(destinationAutocomplete, "DEST");
        this.showExistingRoutesOnPageLoad();
    }

    showExistingRoutesOnPageLoad() {
        let routesStore = JSON.parse(localStorage.getItem('googleMapRoutes'));
        if(routesStore.length > 0) {
            routesStore.forEach(route => {
                this.addRoute(route);
            });
            this.showRouteOnMap(routesStore[0]);
        }
    }

    setupPlaceChangedListener(autocomplete, mode, el) {
        autocomplete.bindTo("bounds", this.map);
        let callBack = function() {
            const place = autocomplete.getPlace();
    
            if (!place.place_id) {
                window.alert("Please select an option from the dropdown list.");
                return;
            }
    
            if (mode === "ORIG") {
                this.route.originPlace = place;
            } else if(mode === "DEST") {
                this.route.destinationPlace = place;
            } else {
                let id = el.parentElement.id;
                this.route.wayPointStops.push({id: id, location: place.formatted_address, stopover: true});
            }
        }
        autocomplete.addListener("place_changed", callBack.bind(this));
    }

    addWayPoint() {
        const stops = document.getElementById('stops');
        let div = document.createElement('div');
        let id = 'stop-'
        if(stops.childNodes && stops.childNodes.length > 0) {
            id +=  stops.childNodes.length;
        } else {
            id += '0';
        }
        div.id = id;
        let el = `<label class="inputLabel">Stop:</label>
        <input id="`+id+`-waypoint-input" class="controls" type="text"
        placeholder="Enter a stop location"/>
        <img id='`+id+`-deleteStop' src="delete.png" class ='deleteIcon' alt="delete image">`
        // <button id='`+id+`-deleteStop' class="actions-danger">delete stop</button>`
        div.innerHTML = el;
        stops.appendChild(div);
        const delStop = document.getElementById(id+'-deleteStop');
        delStop.addEventListener('click', this.deleteStop.bind(this, delStop))
        const waypointInput = document.getElementById(id+"-waypoint-input");
        const waypointInputAutocomplete = new google.maps.places.Autocomplete(
            waypointInput
        );
        this.setupPlaceChangedListener(waypointInputAutocomplete, "WAY", waypointInput);
    }

    deleteStop(evt) {
        let id = evt.parentElement.id;
        evt.parentElement.remove();
        let index = this.route.wayPointStops.findIndex(el => el.id == id);
        this.route.wayPointStops.splice(index, 1);
    }

    addRoute(rt) {
        let routesStore = JSON.parse(localStorage.getItem('googleMapRoutes'));
        let newRouteId = rt ? rt.routeId : 'route-' + eval(routesStore.length + 1);
        let routeName = rt ? rt.routeName : document.getElementById('name-input').value;
        let stops = rt ? rt.waypoints : this.route.wayPointStops;
        let origin = rt ? rt.origin : this.route.originPlace.formatted_address;
        let destination = rt ? rt.destination : this.route.destinationPlace.formatted_address;

        if(!routeName || !origin || !destination) {
            alert('please enter the necessary details');
            return;
        }
        let routes = document.getElementById('routes');
        let routeEL = document.createElement('div');
        routeEL.className = 'routeBox';
        routeEL.id = newRouteId;
        let waypointEL = ``;

        if(stops && stops.length > 0) {
            stops.forEach((point, i) => {
                let x = i+1;
                let stopid = newRouteId+'-stop'+x;
                waypointEL += `<div id="`+stopid+`">
                <label id="`+stopid+`-label" class='inputLabel'>Stop `+x+`:</label>
                <p class='inputLabel'>`+point.location+`</p>
                </div>`
            })
        }

        routeEL.innerHTML = `<h4>`+routeName+`</h4>
        <label class='inputLabel'>Origin:</label>
        <span id="`+newRouteId+`-origin" class='inputLabel'>`+origin+`</span>
        <div style="display: block;" id="`+newRouteId+`-stops">
            `+waypointEL+`
        </div>
        <label class='inputLabel'>Destination:</label>
        <span id="`+newRouteId+`-destination" class='inputLabel'>`+destination+`</span></br>
        <button id="`+newRouteId+`-showRoute" class="actions">show route</button>
        <button id="`+newRouteId+`-deleteRoute" class="actions-danger">Delete route</button>`;
        routes.appendChild(routeEL);

        var routeData = rt ? rt : {
            routeId: newRouteId,
            routeName: routeName,
            origin: origin,
            destination: destination,
            waypoints: stops || []
        }
        let showRoute = document.getElementById(newRouteId+"-showRoute");
        showRoute.addEventListener('click', this.showRouteOnMap.bind(this, routeData));
        let deleteRoute = document.getElementById(newRouteId+"-deleteRoute");
        deleteRoute.addEventListener('click', this.deleteRoute.bind(this, routeData, deleteRoute));

        if(!rt) {
            routesStore.push(routeData);
            localStorage.setItem('googleMapRoutes', JSON.stringify(routesStore));
            this.showRouteOnMap(routeData);
            this.clearInputs();
        }
    }

    deleteRoute(routeData, el) {
        el.parentElement.remove();
        let routesStore = JSON.parse(localStorage.getItem('googleMapRoutes'));
        let index = routesStore.findIndex(route => route.routeId === routeData.routeId);
        routesStore.splice(index, 1);
        localStorage.setItem('googleMapRoutes', JSON.stringify(routesStore));
    }

    clearInputs() {
        this.route = {
            originPlace: '',
            destinationPlace: "",
            wayPointStops: [],
        };
        const stops = document.getElementById('stops');
        stops.innerHTML = ``;
        document.getElementById("origin-input").value = '';
        document.getElementById("destination-input").value = '';
        document.getElementById('name-input').value = '';
    }

    showRouteOnMap(routeData) {
        if (!routeData.origin || !routeData.destination) {
        return;
        }
        const that = this;
        let waypoints = routeData.waypoints.map((el) => {
            return {location: el.location, stopover: true}
        })
        this.directionsService.route({
            origin: routeData.origin,
            destination: routeData.destination,
            waypoints: waypoints,
            travelMode: 'DRIVING',
        }, (response, status) => {
            if (status === "OK") {
            that.directionsRenderer.setDirections(response);
            } else {
            window.alert("Directions request failed due to " + status);
            }
        });
    }

}

window.initMap = initMap;