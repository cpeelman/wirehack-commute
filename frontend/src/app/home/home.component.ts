import { Component, ElementRef, OnChanges, OnInit, ViewChild } from '@angular/core';

import { QuoteService } from './quote.service';
import { ImmoWebService } from '@app/immoweb.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnChanges {
  workLocation = '';
  otherLocation: string;
  housingType = 'HOUSE,APARTMENT';
  rentOrBuy = 'FOR_RENT';
  maxPrice: number;
  minBedroom: number;
  maxDuration = 40;
  houses: any[] = [];
  lat = 50.8063939;
  lng = 4.3151967;
  loading = false;
  noResults = false;

  sortOption: string;

  // dropdown
  dropdownNearbyList: any[] = [];
  selectedNearbyItems: any[] = [];
  dropdownNearbySettings = {};

  dropdownTransportMethodList: any[] = [];
  selectedTransportMethodItems: any[] = [];
  dropdownTransportMethodSettings = {};

  work_lat = 50.8063939;
  work_lng = 4.3151967;

  currentDir = '';

  sliderOptions = {
    floor: 5,
    ceil: 60,
    step: 5,
    showSelectionBar: true,
    translate: (value: number): string => `${value} min`
  };

  @ViewChild('results')
  ResultsProp: ElementRef;

  constructor(private quoteService: QuoteService, private immoWebService: ImmoWebService) {}

  ngOnInit() {
    this.dropdownNearbyList = [
      { item_id: 1, item_text: 'Schools' },
      { item_id: 2, item_text: 'Daycares' },
      { item_id: 3, item_text: 'Activities' },
      { item_id: 4, item_text: 'Groceries' }
    ];
    this.selectedNearbyItems = [];
    this.dropdownNearbySettings = {
      singleSelection: false,
      idField: 'item_id',
      textField: 'item_text'
    };
    this.dropdownTransportMethodList = [
      { item_id: 'bicycling', item_text: 'Cycling' },
      { item_id: 'driving', item_text: 'Driving' },
      { item_id: 'transit', item_text: 'Public transport' },
      { item_id: 'walking', item_text: 'Walking' }
    ];
    this.selectedTransportMethodItems = [];
    this.dropdownTransportMethodSettings = {
      singleSelection: true,
      idField: 'item_id',
      textField: 'item_text'
    };
  }

  ngOnChanges() {
    this.ngOnInit();
  }

  getSuggestions() {
    this.quoteService.getLocationSuggestions(encodeURI(this.workLocation)).subscribe(result => {
      console.log(result);
    });
  }

  center(house: any) {
    this.lat = house.GeoPoint.latitude;
    this.lng = house.GeoPoint.longitude;
  }

  getDirFor(house: any) {
    this.currentDir = `http://maps.google.com/maps?saddr=${this.work_lat},${this.work_lng}&daddr=${
      house.GeoPoint.latitude
    },${house.GeoPoint.longitude}`;
  }

  search() {
    this.loading = true;
    this.noResults = false;
    this.immoWebService.getCenter(this.workLocation).subscribe((results: any) => {
      this.work_lat = results[0];
      this.work_lng = results[1];
      this.lat = results[0];
      this.lng = results[1];
    });
    this.immoWebService
      .getAll(
        this.workLocation,
        this.otherLocation,
        this.maxDuration,
        this.housingType,
        this.rentOrBuy,
        this.minBedroom,
        this.maxPrice
      )
      .subscribe(
        (results: any) => {
          if (results.length === 0) {
            this.noResults = true;
          }
          if (this.sortOption == null) {
            this.sortOption = this.selectedTransportMethodItems[0].item_id;
          }
          this.sortBy(results, this.sortOption);

          this.houses = results.map((item: any) => {
            return {
              Id: item.id,
              PropertyType: item.propertyType,
              LocationType: item.transactionType,
              City: item.city,
              PostalCode: item.postalCode,
              Bedrooms: item.bedrooms,
              Size: item.surface,
              Price: item.price,
              Travel: this.getTravelDurationByPreference(item.travels[0]),
              Image: item.image,
              Info: item.description,
              GeoPoint: item.geoPoint
            };
          });
        },
        error => {
          console.error('error loading', error);
          this.noResults = true;
        },
        () => {
          // window.scrollTo(0, document.body.scrollHeight);
          // TODO: this doesn't work :( scrolling to bottom
          this.loading = false;
        }
      );
  }

  sort() {
    this.sortOption = this.sortOption.toLowerCase();
    this.search();
  }

  sortBy(array: any[], sortOption: string) {
    array.sort((house1: any, house2: any) => {
      if (house1.travels[0][sortOption].duration > house2.travels[0][sortOption].duration) {
        return 1;
      } else if (house1.travels[0][sortOption].duration < house2.travels[0][sortOption].duration) {
        return -1;
      }
      return 0;
    });
  }

  getTravelDurationByPreference(travelDuration: any) {
    const travelDurationWithSelection: any = {
      selected: [],
      other: []
    };
    const preferredDuration = travelDuration[this.selectedTransportMethodItems[0].item_id].duration;
    this.dropdownTransportMethodList.forEach(transportMethod => {
      this.selectedTransportMethodItems.forEach(selectedTransportMethod => {
        if (transportMethod.item_id === selectedTransportMethod.item_id) {
          travelDurationWithSelection.selected.push({
            iconClass: this.getIcon(transportMethod.item_id),
            duration: travelDuration[transportMethod.item_id].duration,
            shorter: false
          });
        } else {
          travelDurationWithSelection.other.push({
            iconClass: this.getIcon(transportMethod.item_id),
            duration: travelDuration[transportMethod.item_id].duration,
            shorter: this.getColorForShortest(travelDuration[transportMethod.item_id].duration, preferredDuration)
          });
        }
      });
    });
    return travelDurationWithSelection;
  }

  getIcon(transportMethod: string) {
    switch (transportMethod) {
      case 'bicycling':
        return 'fa fa-bicycle';
      case 'walking':
        return 'fa fa-walking';
      case 'transit':
        return 'fa fa-bus';
      case 'driving':
        return 'fa fa-car';
    }
  }

  getColorForShortest(duration: number, preferredDuration: number) {
    if (duration < preferredDuration) {
      return 'shorter';
    }
  }

  getPriceString(price: number) {
    let priceString = '' + (price % 1000);
    while (price >= 1000) {
      if (price % 1000 < 10) {
        priceString = '00' + priceString;
      } else if (price % 1000 < 100) {
        priceString = '0' + priceString;
      }
      price = (price - (price % 1000)) / 1000;
      priceString = (price % 1000) + '.' + priceString;
    }
    return priceString;
  }

  getDurationString(duration: number) {
    duration = (duration - (duration % 60)) / 60;
    let durationString = '';
    if (duration < 60) {
      durationString += duration + 'm';
    } else {
      durationString += (duration - (duration % 60)) / 60 + 'h';
      if (duration % 60 < 10) {
        durationString += '0' + (duration % 60);
      } else {
        durationString += duration % 60;
      }
    }
    return durationString;
  }

  getDurationCategory(duration: number) {
    if (duration <= this.maxDuration * 0.5) {
      return 'Good';
    } else if (duration <= this.maxDuration) {
      return 'Ok';
    } else {
      return 'Bad';
    }
  }
}
